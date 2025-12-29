import { injectable } from 'tsyringe'
import { loggers } from '../../../../kernel/shared/logger'
import { AppError } from '../../../../kernel/utils'
import type { CommandMetadata } from '../../decorators/command'
import type { Player } from '../../entities'
import { validateAndExecuteCommand } from '../../helpers/command-validation.helper'
import { CommandExecutionPort, type CommandInfo } from '../ports/command-execution.port'

/**
 * Local command execution service (CORE/STANDALONE modes).
 *
 * @remarks
 * Maintains an in-memory registry of command handlers and executes them with full validation.
 * Controllers declare commands via @Command decorator. During bootstrap, the framework
 * scans and registers handlers via CommandProcessor.
 *
 * Execution pipeline:
 * - Enforces authentication (secure by default unless marked @Public)
 * - Validates arguments using Zod schemas (explicit or auto-generated)
 * - Coerces argument types before invoking handlers
 */
@injectable()
export class CommandService extends CommandExecutionPort {
  private commands = new Map<
    string,
    { meta: CommandMetadata; handler: Function; isPublic: boolean }
  >()

  /**
   * Registers a command handler.
   *
   * @param meta - Command metadata collected from the {@link Command} decorator.
   * @param handler - The bound method to invoke.
   */
  register(meta: CommandMetadata, handler: Function) {
    if (this.commands.has(meta.command.toLowerCase())) {
      loggers.command.error(`Command '${meta.command}' is already registered. Skipped`, {
        command: meta.command,
      })
    }

    this.commands.set(meta.command.toLowerCase(), {
      meta,
      handler,
      isPublic: meta.isPublic ?? false,
    })

    const publicFlag = meta.isPublic ? ' [Public]' : ''
    const schemaFlag = meta.schema ? ' [Validated]' : ''
    loggers.command.debug(`Registered: /${meta.command}${publicFlag}${schemaFlag}`)
  }

  /**
   * Executes a registered command.
   *
   * @remarks
   * **Security**: Commands require authentication by default unless marked with @Public().
   * Unauthenticated attempts are blocked gracefully with player notification.
   *
   * Argument parsing behavior depends on the schema:
   * - Zod object schema: maps raw args to parameter names.
   * - Zod tuple schema: validates positional args.
   * - No schema: attempts to generate a schema from parameter types.
   *
   * @param player - Player invoking the command.
   * @param commandName - Command name (without the leading `/`).
   * @param args - Raw argument list (strings).
   *
   * @throws AppError - If the command does not exist, the schema mismatches parameters, or validation fails.
   */
  async execute(player: Player, commandName: string, args: string[]) {
    const entry = this.commands.get(commandName.toLowerCase())
    if (!entry)
      throw new AppError('COMMAND:NOT_FOUND', `Command not found: ${commandName}`, 'client')

    const { meta, handler, isPublic } = entry

    // ═══════════════════════════════════════════════════════════════
    // SECURE BY DEFAULT: Require authentication unless @Public()
    // ═══════════════════════════════════════════════════════════════
    if (!isPublic) {
      if (!player.accountID) {
        loggers.security.warn(`Unauthenticated command attempt blocked`, {
          command: commandName,
          clientId: player.clientID,
        })
        player.emit('core:auth:required', { command: commandName })
        player.send('You must be authenticated to use this command', 'error')
        return
      }
    }
    return await validateAndExecuteCommand(meta, player, args, handler)
  }

  /**
   * Returns a list of all registered commands.
   */
  getAllCommands(): CommandInfo[] {
    return Array.from(this.commands.values()).map((c) => ({
      command: c.meta.command,
      description: c.meta.description ?? '',
      usage: c.meta.usage ?? '',
      isPublic: c.isPublic,
    }))
  }
}
