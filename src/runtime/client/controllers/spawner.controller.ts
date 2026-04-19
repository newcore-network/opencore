import { PlayerAppearance } from '../../../kernel'
import { Vector3 } from '../../../kernel/utils/vector3'
import { loggers } from '../../../kernel/logger'
import { SYSTEM_EVENTS } from '../../shared/types/system-types'
import { Controller, OnNet } from '../decorators'
import { SpawnService } from '../services'

@Controller()
export class SpawnerController {
  constructor(private readonly spawnService: SpawnService) {}

  @OnNet(SYSTEM_EVENTS.spawner.spawn)
  async handleSpawn(data: {
    position: Vector3
    model: string
    heading?: number
    appearance?: PlayerAppearance
    skipLoadingScreenShutdown?: boolean
  }) {
    loggers.spawn.debug('Spawn event received', data)
    await this.spawnService.spawn(data.position, data.model, data.heading, {
      appearance: data.appearance,
      skipLoadingScreenShutdown: data.skipLoadingScreenShutdown,
    })
  }

  @OnNet(SYSTEM_EVENTS.spawner.respawn)
  async handleRespawn(position: Vector3, heading = 0.0): Promise<void> {
    await this.spawnService.respawn(position, heading)
  }

  @OnNet(SYSTEM_EVENTS.spawner.teleport)
  async handleTeleport(position: Vector3, heading?: number): Promise<void> {
    await this.spawnService.teleportTo(position, heading)
  }
}
