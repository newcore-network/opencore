import { inject, injectable } from 'tsyringe'
import { loggers, PlayerAppearance } from '../../../kernel'
import { Vector3 } from '../../../kernel/utils/vector3'
import { IClientPlatformBridge } from '../adapter/platform-bridge'
import { AppearanceService } from './appearance.service'
import { IClientSpawnBridge } from '../../../adapters/contracts/client/spawn/IClientSpawnBridge'

interface SpawnOptions {
  appearance?: PlayerAppearance
}

@injectable()
export class SpawnService {
  private spawned = false
  private spawning = false

  constructor(
    private readonly appearanceService: AppearanceService,
    @inject(IClientSpawnBridge as any) private readonly spawnBridge: IClientSpawnBridge,
    @inject(IClientPlatformBridge as any) private readonly platform: IClientPlatformBridge,
  ) {}

  async init(): Promise<void> {
    loggers.spawn.debug('SpawnService initialized')
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
      loggers.spawn.debug('Waiting for spawn bridge readiness')
      await this.spawnBridge.waitUntilReady()
      loggers.spawn.debug('Spawn bridge ready, executing spawn', { position, model, heading })
      await this.spawnBridge.spawn({ position, model, heading })

      const ped = this.platform.getLocalPlayerPed()
      if (ped !== 0) {
        if (options?.appearance) {
          loggers.spawn.debug('Applying post-spawn appearance', { ped })
          await this.appearanceService.applyAppearance(ped, options.appearance)
        } else {
          this.appearanceService.setDefaultAppearance(ped)
        }
      }

      this.spawned = true
      loggers.spawn.info('Player spawned successfully', {
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
    await this.spawnBridge.teleport({ position, heading })
  }

  async respawn(position: Vector3, heading = 0.0): Promise<void> {
    await this.spawnBridge.waitUntilReady()
    await this.spawnBridge.respawn({ position, heading })
    this.spawned = true
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
      await new Promise<void>((resolve) => setTimeout(resolve, 0))
    }
  }
}
