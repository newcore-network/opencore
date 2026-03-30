import { inject, injectable } from 'tsyringe'
import { EventsAPI } from '../../../adapters/contracts/transport/events.api'
import { IPlayerLifecycleServer } from '../../../adapters/contracts/server/player-lifecycle/IPlayerLifecycleServer'
import type {
  RespawnPlayerRequest,
  SpawnPlayerRequest,
  TeleportPlayerRequest,
} from '../../../adapters/contracts/server/player-lifecycle/types'
import { SYSTEM_EVENTS } from '../../shared/types/system-types'

@injectable()
export class NodePlayerLifecycleServer extends IPlayerLifecycleServer {
  constructor(@inject(EventsAPI as any) private readonly events: EventsAPI<'server'>) {
    super()
  }

  spawn(playerSrc: string, request: SpawnPlayerRequest): void {
    const target = this.resolveTarget(playerSrc)
    if (!target) return

    this.events.emit(SYSTEM_EVENTS.spawner.spawn, target, {
      position: request.position,
      model: request.model,
      heading: request.heading,
      appearance: request.appearance,
    })
  }

  teleport(playerSrc: string, request: TeleportPlayerRequest): void {
    const target = this.resolveTarget(playerSrc)
    if (!target) return

    this.events.emit(SYSTEM_EVENTS.spawner.teleport, target, request.position, request.heading)
  }

  respawn(playerSrc: string, request: RespawnPlayerRequest): void {
    const target = this.resolveTarget(playerSrc)
    if (!target) return

    this.events.emit(SYSTEM_EVENTS.spawner.respawn, target, request.position, request.heading)
  }

  private resolveTarget(playerSrc: string) {
    const clientId = Number(playerSrc)
    return Number.isFinite(clientId) && clientId > 0 ? clientId : undefined
  }
}
