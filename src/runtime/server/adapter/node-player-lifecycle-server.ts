import { inject, injectable } from 'tsyringe'
import { EventsAPI } from '../../../adapters/contracts/transport/events.api'
import { IPlayerLifecycleServer } from '../../../adapters/contracts/server/player-lifecycle/IPlayerLifecycleServer'
import type {
  RespawnPlayerRequest,
  SpawnPlayerRequest,
  TeleportPlayerRequest,
} from '../../../adapters/contracts/server/player-lifecycle/types'

@injectable()
export class NodePlayerLifecycleServer extends IPlayerLifecycleServer {
  constructor(@inject(EventsAPI as any) private readonly events: EventsAPI<'server'>) {
    super()
  }

  spawn(playerSrc: string, request: SpawnPlayerRequest): void {
    this.events.emit('opencore:spawner:spawn', Number(playerSrc), {
      position: request.position,
      model: request.model,
      heading: request.heading,
      appearance: request.appearance,
    })
  }

  teleport(playerSrc: string, request: TeleportPlayerRequest): void {
    this.events.emit(
      'opencore:spawner:teleport',
      Number(playerSrc),
      request.position,
      request.heading,
    )
  }

  respawn(playerSrc: string, request: RespawnPlayerRequest): void {
    this.events.emit(
      'opencore:spawner:respawn',
      Number(playerSrc),
      request.position,
      request.heading,
    )
  }
}
