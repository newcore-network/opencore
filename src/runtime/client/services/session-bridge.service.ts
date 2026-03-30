import { inject, injectable } from 'tsyringe'
import { EventsAPI } from '../../../adapters/contracts/transport/events.api'
import { coreLogger, LogDomain } from '../../../kernel/logger'
import { Vec3 } from '../../../kernel/utils/vector3'
import { SYSTEM_EVENTS } from '../../shared/types/system-types'
import { IClientLocalPlayerBridge } from '../adapter/local-player-bridge'
import { IClientRuntimeBridge } from '../adapter/runtime-bridge'

const clientSession = coreLogger.child('Session', LogDomain.CLIENT)

/**
 * Registers lightweight client session listeners owned by the active adapter.
 */
@injectable()
export class ClientSessionBridgeService {
  private playerId: string | undefined

  constructor(
    @inject(EventsAPI as any) private readonly events: EventsAPI<'client'>,
    @inject(IClientRuntimeBridge as any) private readonly runtime: IClientRuntimeBridge,
    @inject(IClientLocalPlayerBridge as any)
    private readonly localPlayer: IClientLocalPlayerBridge,
  ) {}

  init(): void {
    const currentResource = this.runtime.getCurrentResourceName()

    this.runtime.on('onClientResourceStart', (resourceName: string) => {
      if (resourceName !== currentResource) return
      clientSession.debug('Client session bridge initialized')
    })

    this.events.on(SYSTEM_EVENTS.session.playerInit, (_ctx, data: { playerId: string }) => {
      this.playerId = data.playerId
      clientSession.info('Player session initialized', { playerId: data.playerId })
    })

    this.events.on(
      SYSTEM_EVENTS.session.teleportTo,
      (_ctx, x: number, y: number, z: number, heading?: number) => {
        this.localPlayer.setPosition(Vec3.create(x, y, z), heading)
      },
    )
  }

  getPlayerId(): string | undefined {
    return this.playerId
  }
}
