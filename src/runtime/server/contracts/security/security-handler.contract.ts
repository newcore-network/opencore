import { SecurityError } from '@open-core/framework'
import { Server } from '../../'

export abstract class SecurityHandlerContract {
  abstract handleViolation(player: Server.Player, error: SecurityError): Promise<void>
}
