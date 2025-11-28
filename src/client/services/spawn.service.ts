import { injectable } from 'tsyringe'
import { OnNet } from '../decorators/onNet'
import { Vector3 } from '../../utils'

const delay = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms))

@injectable()
export class Spawner {
  private spawned = false

  async init(): Promise<void> {
    console.log('[Core] SpawnService Check')
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
    console.log('[Core] First spawn:', JSON.stringify(position), 'model:', model)

    await this.ensureNetworkReady()
    this.closeLoadingScreens()
    await this.setPlayerModel(model)
    const ped = await this.ensurePed()
    await this.placePed(ped, position, heading)
    this.spawned = true
    console.log('[Core] Player spawned (first).')
  }

  async teleportTo(position: Vector3, heading?: number): Promise<void> {
    const ped = await this.ensurePed()

    FreezeEntityPosition(ped, true)
    SetEntityCoordsNoOffset(ped, position.x, position.y, position.z, false, false, false)
    if (heading !== undefined) {
      SetEntityHeading(ped, heading)
    }
    FreezeEntityPosition(ped, false)

    console.log('[Core] Teleport to', JSON.stringify(position))
  }

  async respawn(position: Vector3, heading = 0.0): Promise<void> {
    const ped = await this.ensurePed()

    ClearPedTasksImmediately(ped)
    SetEntityHealth(ped, GetEntityMaxHealth(ped))
    await this.teleportTo(position, heading)
    console.log('[Core] Player respawned in', JSON.stringify(position))
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
      console.error(`[Core] Invalid model: ${model}`)
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
