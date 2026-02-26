import { SecurityError } from '../../../../kernel/error/security.error'
import { Player } from '../../entities/player'

export abstract class SecurityHandlerContract {
  abstract handleViolation(player: Player, error: SecurityError): Promise<void>
}
