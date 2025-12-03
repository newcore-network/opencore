import { injectable } from 'tsyringe'
import { SecurityHandlerContract } from '../../templates/security/security-handler.contract'
import { Server } from '../../..'
import { SecurityError } from '../../../utils/errors'
import { loggers } from '../../../shared/logger'

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
