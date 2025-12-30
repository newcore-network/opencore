import { Server } from '../../../..'
import { SecurityError } from '../../../../kernel/utils/error/security.error'

export abstract class SecurityHandlerContract {
  abstract handleViolation(player: Server.Player, error: SecurityError): Promise<void>
}
