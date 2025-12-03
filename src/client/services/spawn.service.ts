import { injectable } from 'tsyringe'
import { OnNet } from '../decorators/onNet'
import { Vector3 } from '../../utils'
import { loggers } from '../../shared/logger'

const delay = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms))

@injectable()
export class Spawner {
  private spawned = false

  async init(): Promise<void> {
    loggers.spawn.debug('SpawnService initialized')
  }

  @OnNet('core:spawner:spawn')
  async handleSpawn(data: { position: Vector3; model: string }) {
    await this.spawn(data.position, data.model)
  }
  @OnNet('core:spawner:respawn')
  async handleRespawn(position: Vector3, heading = 0.0): Promise<void> {
    await this.respawn(position, heading)
  }
  @OnNet('core:spawner:teleport')
  async handleTeleport(position: Vector3, heading?: number): Promise<void> {
    await this.teleportTo(position, heading)
  }

  async spawn(position: Vector3, model: string, heading = 0.0): Promise<void> {
    loggers.spawn.info('First spawn requested', {
      position: { x: position.x, y: position.y, z: position.z },
      model,
    })

    await this.ensureNetworkReady()
    this.closeLoadingScreens()
    await this.setPlayerModel(model)
    const ped = await this.ensurePed()
    await this.placePed(ped, position, heading)
    this.spawned = true
    loggers.spawn.info('Player spawned successfully (first spawn)')
  }

  async teleportTo(position: Vector3, heading?: number): Promise<void> {
    const ped = await this.ensurePed()

    FreezeEntityPosition(ped, true)
    SetEntityCoordsNoOffset(ped, position.x, position.y, position.z, false, false, false)
    if (heading !== undefined) {
      SetEntityHeading(ped, heading)
    }
    FreezeEntityPosition(ped, false)

    loggers.spawn.debug('Teleported', {
      position: { x: position.x, y: position.y, z: position.z },
    })
  }

  async respawn(position: Vector3, heading = 0.0): Promise<void> {
    const ped = await this.ensurePed()

    ClearPedTasksImmediately(ped)
    SetEntityHealth(ped, GetEntityMaxHealth(ped))
    await this.teleportTo(position, heading)
    loggers.spawn.info('Player respawned', {
      position: { x: position.x, y: position.y, z: position.z },
    })
  }

  isSpawned(): boolean {
    return this.spawned
  }

  private async ensureNetworkReady(): Promise<void> {
    while (!NetworkIsSessionStarted()) {
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
      loggers.spawn.error(`Invalid model requested`, { model })
      throw new Error('MODEL_INVALID')
    }

    RequestModel(modelHash)
    while (!HasModelLoaded(modelHash)) {
      await delay(0)
    }

    SetPlayerModel(PlayerId(), modelHash)
    SetModelAsNoLongerNeeded(modelHash)
  }

  private async ensurePed(): Promise<number> {
    let ped = PlayerPedId()
    while (ped === 0) {
      await delay(0)
      ped = PlayerPedId()
    }
    return ped
  }

  private async placePed(ped: number, position: Vector3, heading: number): Promise<void> {
    FreezeEntityPosition(ped, true)

    SetEntityCoordsNoOffset(ped, position.x, position.y, position.z, false, false, false)
    SetEntityHeading(ped, heading)

    ResetEntityAlpha(ped)
    SetEntityVisible(ped, true, false)
    SetEntityCollision(ped, true, true)
    SetEntityInvincible(ped, false)

    ClearPedTasksImmediately(ped)
    RemoveAllPedWeapons(ped, true)

    FreezeEntityPosition(ped, false)

    if (!IsScreenFadedIn() && !IsScreenFadingIn()) {
      DoScreenFadeIn(500)
    }
  }
}
