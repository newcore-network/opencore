import { Server } from '../../'
import { SecurityError } from '@open-core/framework'

export abstract class SecurityHandlerContract {
  abstract handleViolation(player: Server.Player, error: SecurityError): Promise<void>
}
