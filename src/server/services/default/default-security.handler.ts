import { injectable } from 'tsyringe'
import { SecurityHandlerContract } from '../../templates/security/security-handler.contract'
import { Server } from '../../..'
import { SecurityError } from '../../../utils/errors'

@injectable()
export class DefaultSecurityHandler extends SecurityHandlerContract {
  async handleViolation(player: Server.Player, error: SecurityError) {
    console.warn(
      `[CORE SECURITY - Default] Violation detected from [${player.name}]: ${error.message} ` +
        `| Action Suggested: ${error.action}`,
    )
  }
}
