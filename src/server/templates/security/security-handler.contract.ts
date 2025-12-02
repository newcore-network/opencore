import type { Server } from '../../..'
import type { SecurityError } from '../../../utils'

export abstract class SecurityHandlerContract {
  abstract handleViolation(player: Server.Player, error: SecurityError): Promise<void>
}
