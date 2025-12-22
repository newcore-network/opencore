import { injectable } from 'tsyringe'
import type { Player } from '../../entities/player'
import {
  NetEventSecurityObserverContract,
  type NetEventInvalidPayloadContext,
} from '../../templates/security/net-event-security-observer.contract'

@injectable()
export class DefaultNetEventSecurityObserver extends NetEventSecurityObserverContract {
  async onInvalidPayload(_player: Player, _ctx: NetEventInvalidPayloadContext): Promise<void> {}
}
