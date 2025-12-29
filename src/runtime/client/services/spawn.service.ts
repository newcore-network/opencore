import { injectable } from 'tsyringe'
import { loggers } from '../../../kernel/shared'
import { Vector3 } from '../../../kernel/utils'
import { AppearanceService } from './appearance.service'
import { PlayerAppearance } from '../interfaces/appearance.interface'

const delay = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms))

interface SpawnOptions {
  /** Optional: Apply complete character appearance (RP clothing, face, props, tattoos...) */
  appearance?: PlayerAppearance
}

const NETWORK_TIMEOUT_MS = 15_000
const PED_TIMEOUT_MS = 10_000
const COLLISION_TIMEOUT_MS = 7_000

/**
 * Handles all player spawning logic on the client.
 *
 * This service manages the complete lifecycle of a player spawn:
 * - Waiting for the network session
 * - Loading and applying the player model
 * - Ensuring collision and world data is ready
 * - Resurrecting the player cleanly
 * - Applying default ped components for freemode models
 * - Fading the screen in/out during transitions
 *
 * The service is designed to be robust, predictable, and safe for any gamemode.
 */
@injectable()
export class SpawnService {
  private spawned = false
  private spawning = false

  constructor(private appearanceService: AppearanceService) {}

  async init(): Promise<void> {
    loggers.spawn.debug('SpawnService initialized')
  }

  /**
   * Performs the first spawn of the player.
   *
   * This method handles:
   * - Fade out
   * - Closing loading screens
   * - Setting the player model
   * - Ensuring the ped exists
   * - Ensuring collision is loaded
   * - Resurrecting the player
   * - Preparing the ped for gameplay
   * - Placing the player at the desired position
   * - Fade in
   *
   * It should only be called once when the player joins.
   */
  async spawn(
    position: Vector3,
    model: string,
    heading = 0.0,
    options?: SpawnOptions,
  ): Promise<void> {
    if (this.spawning) {
      loggers.spawn.warn('Spawn requested while a spawn is already in progress')
      return
    }
    this.spawning = true

    try {
      await this.ensureNetworkReady()

      if (!IsScreenFadedOut() && !IsScreenFadingOut()) {
        DoScreenFadeOut(500)
        while (!IsScreenFadedOut()) {
          await delay(0)
        }
      }

      this.closeLoadingScreens()
      await this.setPlayerModel(model)
      const ped = await this.ensurePed()
      await this.applyAppearanceIfNeeded(ped, options?.appearance)

      await this.ensureCollisionAt(position, ped)
      NetworkResurrectLocalPlayer(position.x, position.y, position.z, heading, 0, false)
      const finalPed = await this.ensurePed()

      await this.setupPedForGameplay(finalPed)
      await this.placePed(finalPed, position, heading)

      this.spawned = true

      if (!IsScreenFadedIn() && !IsScreenFadingIn()) {
        DoScreenFadeIn(500)
      }

      loggers.spawn.info('Player spawned successfully (first spawn)', {
        position: { x: position.x, y: position.y, z: position.z },
        model,
      })
    } catch (err) {
      loggers.spawn.error('Failed to spawn player', {
        error: err instanceof Error ? err.message : String(err),
      })
      throw err
    } finally {
      this.spawning = false
    }
  }

  /**
   * Teleports the player instantly to a new position.
   * Does not change the model or resurrect the player.
   * Safe for gameplay use.
   */
  async teleportTo(position: Vector3, heading?: number): Promise<void> {
    const ped = await this.ensurePed()

    await this.ensureCollisionAt(position, ped)

    FreezeEntityPosition(ped, true)
    SetEntityCoordsNoOffset(ped, position.x, position.y, position.z, false, false, false)

    if (heading !== undefined) {
      SetEntityHeading(ped, heading)
    }

    FreezeEntityPosition(ped, false)
  }

  /**
   * Respawns the player after death or a gameplay event.
   * Restores health, resurrects the player, loads collision,
   * prepares the ped and teleports them to the desired location.
   */
  async respawn(position: Vector3, heading = 0.0): Promise<void> {
    const ped = await this.ensurePed()

    await this.ensureCollisionAt(position, ped)

    ClearPedTasksImmediately(ped)
    SetEntityHealth(ped, GetEntityMaxHealth(ped))

    NetworkResurrectLocalPlayer(position.x, position.y, position.z, heading, 0, false)

    const finalPed = await this.ensurePed()
    await this.setupPedForGameplay(finalPed)
    await this.teleportTo(position, heading)

    loggers.spawn.info('Player respawned', {
      position: { x: position.x, y: position.y, z: position.z },
      heading,
    })
  }

  /**
   * Returns whether the player has completed their first spawn.
   */
  isSpawned(): boolean {
    return this.spawned
  }

  /**
   * Allows other systems to wait until the player is fully spawned.
   */
  async waitUntilSpawned(): Promise<void> {
    while (!this.spawned) {
      await delay(0)
    }
  }

  private async ensureNetworkReady(): Promise<void> {
    const start = GetGameTimer()

    while (!NetworkIsSessionStarted()) {
      if (GetGameTimer() - start > NETWORK_TIMEOUT_MS) {
        loggers.spawn.error('Network session did not start in time')
        throw new Error('NETWORK_TIMEOUT')
      }
      await delay(0)
    }
  }

  private closeLoadingScreens(): void {
    try {
      ShutdownLoadingScreen()
    } catch {}
    try {
      ShutdownLoadingScreenNui()
    } catch {}
  }

  private async setPlayerModel(model: string): Promise<void> {
    const modelHash = GetHashKey(model)

    if (!IsModelInCdimage(modelHash) || !IsModelValid(modelHash)) {
      loggers.spawn.error('Invalid model requested', { model })
      throw new Error('MODEL_INVALID')
    }

    RequestModel(modelHash)
    while (!HasModelLoaded(modelHash)) {
      await delay(0)
    }

    SetPlayerModel(PlayerId(), modelHash)
    SetModelAsNoLongerNeeded(modelHash)

    const ped = PlayerPedId()
    if (ped !== 0) {
      SetPedDefaultComponentVariation(ped)
    }
  }

  private async ensurePed(): Promise<number> {
    const start = GetGameTimer()
    let ped = PlayerPedId()

    while (ped === 0) {
      if (GetGameTimer() - start > PED_TIMEOUT_MS) {
        loggers.spawn.error('PlayerPedId() did not become valid in time')
        throw new Error('PED_TIMEOUT')
      }
      await delay(0)
      ped = PlayerPedId()
    }

    return ped
  }

  private async ensureCollisionAt(position: Vector3, ped: number): Promise<void> {
    RequestCollisionAtCoord(position.x, position.y, position.z)

    const start = GetGameTimer()
    while (!HasCollisionLoadedAroundEntity(ped)) {
      if (GetGameTimer() - start > COLLISION_TIMEOUT_MS) {
        loggers.spawn.warn('Collision did not fully load around entity in time', {
          x: position.x,
          y: position.y,
          z: position.z,
        })
        break
      }
      await delay(0)
    }
  }

  private async setupPedForGameplay(ped: number): Promise<void> {
    SetEntityAsMissionEntity(ped, true, true)

    ClearPedTasksImmediately(ped)
    RemoveAllPedWeapons(ped, true)

    ResetEntityAlpha(ped)
    await delay(0)
    SetEntityAlpha(ped, 255, false)
    SetEntityVisible(ped, true, false)
    SetEntityCollision(ped, true, true)
    SetEntityInvincible(ped, false)
  }

  private async placePed(ped: number, position: Vector3, heading: number): Promise<void> {
    FreezeEntityPosition(ped, true)

    SetEntityCoordsNoOffset(ped, position.x, position.y, position.z, false, false, false)
    SetEntityHeading(ped, heading)

    await delay(0)

    FreezeEntityPosition(ped, false)
  }

  private async applyAppearanceIfNeeded(ped: number, appearance?: PlayerAppearance): Promise<void> {
    if (!appearance) {
      SetPedDefaultComponentVariation(ped)
      return
    }

    if (!this.appearanceService.validateAppearance(appearance)) {
      SetPedDefaultComponentVariation(ped)
      return
    }

    try {
      await this.appearanceService.applyAppearance(ped, appearance)
    } catch (error) {
      loggers.spawn.error('Failed to apply appearance, using default variation', {
        error: error instanceof Error ? error.message : String(error),
      })
      SetPedDefaultComponentVariation(ped)
    }
  }
}
