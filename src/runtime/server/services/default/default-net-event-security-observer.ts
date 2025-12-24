import { injectable } from 'tsyringe'
import type { Player } from '../../entities/player'
import {
  NetEventSecurityObserverContract,
  type NetEventInvalidPayloadContext,
} from '../../templates/security/net-event-security-observer.contract'

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
