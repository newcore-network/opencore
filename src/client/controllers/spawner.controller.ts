import { Vector3 } from '../../utils'
import { Controller, OnNet } from '../decorators'
import { SpawnService } from '../services'

@Controller()
export class SpawnerController {
  constructor(private readonly spawnService: SpawnService) {}

  @OnNet('opencore:spawner:spawn')
  async handleSpawn(data: { position: Vector3; model: string }) {
    await this.spawnService.spawn(data.position, data.model)
  }

  @OnNet('opencore:spawner:respawn')
  async handleRespawn(position: Vector3, heading = 0.0): Promise<void> {
    await this.spawnService.respawn(position, heading)
  }

  @OnNet('opencore:spawner:teleport')
  async handleTeleport(position: Vector3, heading?: number): Promise<void> {
    await this.spawnService.teleportTo(position, heading)
  }
}
