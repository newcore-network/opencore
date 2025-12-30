import { injectable } from 'tsyringe'
import {
  type NetEventInvalidPayloadContext,
  NetEventSecurityObserverContract,
} from '../../contracts/security/net-event-security-observer.contract'
import { Player } from '../../entities/player'

/**
 * Default net-event security observer.
 *
 * @remarks
 * This implementation is a no-op. Projects can provide an implementation via DI to log invalid
 * payloads, emit metrics, or apply additional security actions.
 */
@injectable()
export class DefaultNetEventSecurityObserver extends NetEventSecurityObserverContract {
  /**
   * Called when a net event payload fails validation.
   */
  async onInvalidPayload(_player: Player, _ctx: NetEventInvalidPayloadContext): Promise<void> {}
}
