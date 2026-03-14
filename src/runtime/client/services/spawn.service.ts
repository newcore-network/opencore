import { inject, injectable } from 'tsyringe'
import { loggers, PlayerAppearance } from '../../../kernel'
import { Vector3 } from '../../../kernel/utils/vector3'
import { IClientPlatformBridge } from '../adapter/platform-bridge'
import { IClientRuntimeBridge } from '../adapter/runtime-bridge'
import { AppearanceService } from './appearance.service'

const delay = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms))

interface SpawnOptions {
  appearance?: PlayerAppearance
}

const NETWORK_TIMEOUT_MS = 15_000
const PED_TIMEOUT_MS = 10_000
const COLLISION_TIMEOUT_MS = 7_000

function isCfxRuntime(): boolean {
  return typeof (globalThis as any).GetGameName === 'function'
}

function detectGameProfile(): 'gta5' | 'rdr3' | 'common' {
  const getGameName = (globalThis as any).GetGameName
  if (typeof getGameName !== 'function') return 'common'
  const raw = String(getGameName()).toLowerCase()
  if (raw.includes('rdr')) return 'rdr3'
  if (raw.includes('gta')) return 'gta5'
  return 'common'
}

const IS_RDR3_PROFILE = isCfxRuntime() && detectGameProfile() === 'rdr3'

@injectable()
export class SpawnService {
  private spawned = false
  private spawning = false
  private readonly skipAppearancePipeline = IS_RDR3_PROFILE

  constructor(
    private appearanceService: AppearanceService,
    @inject(IClientPlatformBridge as any) private readonly platform: IClientPlatformBridge,
    @inject(IClientRuntimeBridge as any) private readonly runtime: IClientRuntimeBridge,
  ) {}

  async init(): Promise<void> {
    loggers.spawn.debug('SpawnService initialized')
    if (this.skipAppearancePipeline) {
      loggers.spawn.debug('RedM profile detected: skipping appearance pipeline during spawn')
    }
  }

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

      if (!this.platform.isScreenFadedOut() && !this.platform.isScreenFadingOut()) {
        this.platform.doScreenFadeOut(500)
        while (!this.platform.isScreenFadedOut()) {
          await delay(0)
        }
      }

      this.closeLoadingScreens()
      await this.setPlayerModel(model)
      const ped = await this.ensurePed()
      await this.applyAppearanceIfNeeded(ped, options?.appearance)

      await this.ensureCollisionAt(position, ped)
      this.platform.networkResurrectLocalPlayer(position, heading)
      const finalPed = await this.ensurePed()

      await this.setupPedForGameplay(finalPed)
      await this.placePed(finalPed, position, heading)

      this.spawned = true

      if (!this.platform.isScreenFadedIn() && !this.platform.isScreenFadingIn()) {
        this.platform.doScreenFadeIn(500)
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

  async teleportTo(position: Vector3, heading?: number): Promise<void> {
    const ped = await this.ensurePed()
    await this.ensureCollisionAt(position, ped)
    this.platform.freezeEntityPosition(ped, true)
    this.platform.setEntityCoordsNoOffset(ped, position)
    if (heading !== undefined) {
      this.platform.setEntityHeading(ped, heading)
    }
    this.platform.freezeEntityPosition(ped, false)
  }

  async respawn(position: Vector3, heading = 0.0): Promise<void> {
    const ped = await this.ensurePed()
    await this.ensureCollisionAt(position, ped)

    this.platform.clearPedTasksImmediately(ped)
    this.platform.setEntityHealth(ped, this.platform.getEntityMaxHealth(ped))
    this.platform.networkResurrectLocalPlayer(position, heading)

    const finalPed = await this.ensurePed()
    await this.setupPedForGameplay(finalPed)
    await this.teleportTo(position, heading)

    loggers.spawn.info('Player respawned', {
      position: { x: position.x, y: position.y, z: position.z },
      heading,
    })
  }

  isSpawned(): boolean {
    return this.spawned
  }

  async waitUntilSpawned(): Promise<void> {
    while (!this.spawned) {
      await delay(0)
    }
  }

  private async ensureNetworkReady(): Promise<void> {
    const start = this.runtime.getGameTimer()
    loggers.spawn.debug('Waiting for network readiness')
    while (!this.platform.networkIsSessionStarted()) {
      if (this.runtime.getGameTimer() - start > NETWORK_TIMEOUT_MS) {
        loggers.spawn.error('Network session did not start in time')
        throw new Error('NETWORK_TIMEOUT')
      }
      await delay(0)
    }
    loggers.spawn.debug('Network ready confirmed')
  }

  private closeLoadingScreens(): void {
    try {
      this.platform.shutdownLoadingScreen()
    } catch {}
    try {
      this.platform.shutdownLoadingScreenNui()
    } catch {}
  }

  private async setPlayerModel(model: string): Promise<void> {
    const modelHash = this.platform.getHashKey(model)
    loggers.spawn.debug('Setting player model', { model, modelHash })

    if (!this.platform.isModelInCdimage(modelHash) || !this.platform.isModelValid(modelHash)) {
      loggers.spawn.error('Invalid model requested', { model })
      throw new Error('MODEL_INVALID')
    }

    this.platform.requestModel(modelHash)
    while (!this.platform.hasModelLoaded(modelHash)) {
      await delay(0)
    }

    this.platform.setPlayerModel(this.platform.playerId(), modelHash)
    this.platform.setModelAsNoLongerNeeded(modelHash)

    const ped = this.platform.getLocalPlayerPed()
    if (ped !== 0 && !this.skipAppearancePipeline) {
      this.applyDefaultAppearanceSafe(ped)
    }
  }

  private async ensurePed(): Promise<number> {
    const start = this.runtime.getGameTimer()
    let ped = this.platform.getLocalPlayerPed()

    while (ped === 0) {
      if (this.runtime.getGameTimer() - start > PED_TIMEOUT_MS) {
        loggers.spawn.error('Local player ped did not become valid in time')
        throw new Error('PED_TIMEOUT')
      }
      await delay(0)
      ped = this.platform.getLocalPlayerPed()
    }

    loggers.spawn.debug('Local ped resolved', { ped })
    return ped
  }

  private async ensureCollisionAt(position: Vector3, ped: number): Promise<void> {
    this.platform.requestCollisionAtCoord(position)

    const start = this.runtime.getGameTimer()
    while (!this.platform.hasCollisionLoadedAroundEntity(ped)) {
      if (this.runtime.getGameTimer() - start > COLLISION_TIMEOUT_MS) {
        loggers.spawn.warn('Collision did not fully load around entity in time', position)
        break
      }
      await delay(0)
    }
  }

  private async setupPedForGameplay(ped: number): Promise<void> {
    this.platform.setEntityAsMissionEntity(ped, true, true)
    this.platform.clearPedTasksImmediately(ped)
    this.platform.removeAllPedWeapons(ped, true)
    this.platform.resetEntityAlpha(ped)
    await delay(0)
    this.platform.setEntityAlpha(ped, 255)
    this.platform.setEntityVisible(ped, true)
    this.platform.setEntityCollision(ped, true)
    this.platform.setEntityInvincible(ped, false)
  }

  private async placePed(ped: number, position: Vector3, heading: number): Promise<void> {
    this.platform.freezeEntityPosition(ped, true)
    this.platform.setEntityCoordsNoOffset(ped, position)
    this.platform.setEntityHeading(ped, heading)
    await delay(0)
    this.platform.freezeEntityPosition(ped, false)
  }

  private async applyAppearanceIfNeeded(ped: number, appearance?: PlayerAppearance): Promise<void> {
    if (this.skipAppearancePipeline) return

    if (!appearance) {
      this.applyDefaultAppearanceSafe(ped)
      return
    }

    const validation = this.appearanceService.validateAppearance(appearance)
    if (!validation.valid) {
      loggers.spawn.warn('Invalid appearance data', { errors: validation.errors })
      this.applyDefaultAppearanceSafe(ped)
      return
    }

    try {
      await this.appearanceService.applyAppearance(ped, appearance)
    } catch (error) {
      loggers.spawn.error('Failed to apply appearance, using default variation', {
        error: error instanceof Error ? error.message : String(error),
      })
      this.applyDefaultAppearanceSafe(ped)
    }
  }

  private applyDefaultAppearanceSafe(ped: number): void {
    this.appearanceService.setDefaultAppearance(ped)
  }
}
