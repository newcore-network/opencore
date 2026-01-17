import { SecurityError } from '../../../../kernel/error/security.error'
import { Server } from '../../'

export abstract class SecurityHandlerContract {
  abstract handleViolation(player: Server.Player, error: SecurityError): Promise<void>
}
