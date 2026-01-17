import { injectable } from 'tsyringe'
import { loggers } from '../../../../kernel/logger'
import {
  type CommandErrorContext,
  CommandErrorObserverContract,
} from '../../contracts/security/command-error-observer.contract'

/**
 * Default implementation for {@link CommandErrorObserverContract}.
 *
 * @remarks
 * The framework ships with a safe default that only logs.
 * Projects can override this by registering their own observer in the DI container.
 */
@injectable()
export class DefaultCommandErrorObserver extends CommandErrorObserverContract {
  /**
   * Logs the error context using the command logger.
   */
  async onError(ctx: CommandErrorContext): Promise<void> {
    loggers.command.error(`Command error`, {
      mode: ctx.mode,
      scope: ctx.scope,
      stage: ctx.stage,
      command: ctx.commandName,
      ownerResourceName: ctx.ownerResourceName,
      playerId: ctx.player.clientId,
      accountId: ctx.player.accountId,
      code: ctx.error.code,
      origin: ctx.error.origin,
      message: ctx.error.message,
      details: ctx.error.details,
    })
  }
}
