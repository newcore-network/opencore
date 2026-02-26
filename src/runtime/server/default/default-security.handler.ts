import { injectable } from 'tsyringe'
import { SecurityError } from '../../../kernel/error/security.error'
import { loggers } from '../../../kernel/logger'
import { SecurityHandlerContract } from '../contracts/security/security-handler.contract'
import { Player } from '../entities'

/**
 * Default implementation of the security handler.
 *
 * @remarks
 * The default behavior is to log security violations. Projects can provide their own
 * implementation via DI to apply stricter policies (kick/ban/metrics).
 */
@injectable()
export class DefaultSecurityHandler extends SecurityHandlerContract {
  /**
   * Handles a detected security violation.
   *
   * @param player - Player who triggered the violation.
   * @param error - Security error describing the violation.
   */
  async handleViolation(player: Player, error: SecurityError) {
    loggers.security.warn(`Security violation detected`, {
      playerName: player.name,
      playerId: player.clientID,
      message: error.message,
      suggestedAction: error.action,
    })
  }
}
