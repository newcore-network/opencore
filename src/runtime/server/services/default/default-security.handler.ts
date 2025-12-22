import { injectable } from 'tsyringe'
import { SecurityHandlerContract } from '../../templates/security/security-handler.contract'
import { loggers } from '../../../../kernel/shared/logger'
import { Player } from '../../entities'
import { SecurityError } from '../../../../kernel/utils/error/security.error'

@injectable()
export class DefaultSecurityHandler extends SecurityHandlerContract {
  async handleViolation(player: Player, error: SecurityError) {
    loggers.security.warn(`Security violation detected`, {
      playerName: player.name,
      playerId: player.clientID,
      message: error.message,
      suggestedAction: error.action,
    })
  }
}
