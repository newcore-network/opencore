import { injectable } from 'tsyringe'
import { SecurityHandlerContract } from '../../templates/security/security-handler.contract'
import { Server } from '../../..'
import { loggers } from '../../../shared/logger'
import { SecurityError } from '../../../utils/error/security.error'

@injectable()
export class DefaultSecurityHandler extends SecurityHandlerContract {
  async handleViolation(player: Server.Player, error: SecurityError) {
    loggers.security.warn(`Security violation detected`, {
      playerName: player.name,
      playerId: player.clientID,
      message: error.message,
      suggestedAction: error.action,
    })
  }
}
