import { inject, injectable } from 'tsyringe'
import { EventsAPI } from '../../../adapters/contracts/transport/events.api'
import { Players } from '../ports/players.api-port'
import { IPlayerLifecycleServer } from '../../../adapters/contracts/server/player-lifecycle/IPlayerLifecycleServer'
import type {
  RespawnPlayerRequest,
  SpawnPlayerRequest,
  TeleportPlayerRequest,
} from '../../../adapters/contracts/server/player-lifecycle/types'

@injectable()
export class NodePlayerLifecycleServer extends IPlayerLifecycleServer {
  constructor(
    @inject(EventsAPI as any) private readonly events: EventsAPI<'server'>,
    @inject(Players as any) private readonly players: Players,
  ) {
    super()
  }

  spawn(playerSrc: string, request: SpawnPlayerRequest): void {
    const target = this.resolveTarget(playerSrc)
    if (!target) return

    this.events.emit('opencore:spawner:spawn', target, {
      position: request.position,
      model: request.model,
      heading: request.heading,
      appearance: request.appearance,
    })
  }

  teleport(playerSrc: string, request: TeleportPlayerRequest): void {
    const target = this.resolveTarget(playerSrc)
    if (!target) return

    this.events.emit('opencore:spawner:teleport', target, request.position, request.heading)
  }

  respawn(playerSrc: string, request: RespawnPlayerRequest): void {
    const target = this.resolveTarget(playerSrc)
    if (!target) return

    this.events.emit('opencore:spawner:respawn', target, request.position, request.heading)
  }

  private resolveTarget(playerSrc: string) {
    return this.players.getByClient(Number(playerSrc))
  }
}
