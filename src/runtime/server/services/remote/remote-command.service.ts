import { inject, injectable } from 'tsyringe'
import { IExports } from '../../../../adapters/contracts/IExports'
import { loggers } from '../../../../kernel/shared/logger'
import { AppError } from '../../../../kernel/utils'
import type { CommandMetadata } from '../../decorators/command'
import type { Player } from '../../entities'
import { validateAndExecuteCommand } from '../../helpers/command-validation.helper'
import { getRuntimeContext } from '../../runtime'
import type { CoreCommandsExports } from '../../types/core-exports'
import { CommandExecutionPort, type CommandInfo } from '../ports/command-execution.port'

/**
 * Stored command entry with full metadata for local validation.
 */
interface CommandEntry {
  meta: CommandMetadata
  handler: Function
}

/**
 * Remote command service for RESOURCE mode.
 *
 * @remarks
 * In RESOURCE mode, this service:
 * - Stores command handlers and metadata locally in the resource
 * - Registers command metadata with CORE via exports
 * - Executes handlers when invoked by CORE via net event
 * - Validates arguments using Zod schemas (same as CommandService)
 *
 * Flow:
 * 1. Resource declares @Command → metadata registered with CORE
 * 2. Player executes command → CORE validates security and emits event to resource
 * 3. Resource receives event → validates schema → executes handler
 *
 * Security validation is split:
 * - CORE validates: @Guard (rank/permission), @Throttle (rate limit), @RequiresState
 * - RESOURCE validates: Zod schema (not serializable, must be local)
 */
@injectable()
export class RemoteCommandService extends CommandExecutionPort {
  private commands = new Map<string, CommandEntry>()

  constructor(@inject(IExports as any) private exportsService: IExports) {
    super()
  }

  /**
   * Gets typed access to CORE resource exports.
   */
  private get core(): CoreCommandsExports {
    const { coreResourceName } = getRuntimeContext()
    const coreExports = this.exportsService.getResource<CoreCommandsExports>(coreResourceName)

    if (!coreExports) {
      throw new Error(
        `[OpenCore] CORE resource '${coreResourceName}' exports not found. ` +
          `Ensure the CORE resource is started BEFORE RESOURCE mode resources. ` +
          `Add 'ensure ${coreResourceName}' before this resource in server.cfg`,
      )
    }

    return coreExports
  }

  /**
   * Registers a command handler locally and with CORE.
   *
   * @remarks
   * The handler and full metadata are stored locally for schema validation.
   * Only serializable metadata is sent to CORE for security validation.
   */
  register(metadata: CommandMetadata, handler: Function): void {
    const commandKey = metadata.command.toLowerCase()

    // Store handler with full metadata locally (for schema validation)
    this.commands.set(commandKey, {
      meta: metadata,
      handler,
    })

    // Register metadata with CORE (security only, schema is not serializable)
    this.core.registerCommand({
      command: metadata.command,
      description: metadata.description,
      usage: metadata.usage,
      isPublic: metadata.isPublic ?? false,
      resourceName: GetCurrentResourceName(),
      security: metadata.security,
    })

    const publicFlag = metadata.isPublic ? ' [Public]' : ''
    const schemaFlag = metadata.schema ? ' [Validated]' : ''
    const securityFlags = []
    if (metadata.security?.guard) securityFlags.push('Guard')
    if (metadata.security?.throttle) securityFlags.push('Throttle')
    if (metadata.security?.requiresState) securityFlags.push('RequiresState')
    const securityInfo = securityFlags.length > 0 ? ` (${securityFlags.join(', ')})` : ''

    loggers.command.debug(
      `Registered remote command: /${metadata.command}${publicFlag}${schemaFlag}${securityInfo} (delegated to CORE)`,
    )
  }

  /**
   * Executes a command handler stored in this resource.
   *
   * @remarks
   * Called by the resource's command execution controller when CORE
   * emits a command execution event to this resource.
   *
   * CORE has already validated:
   * - @Guard (rank/permission requirements)
   * - @Throttle (rate limiting)
   * - @RequiresState (player state)
   * - @Public (authentication - if not public, player must be authenticated)
   *
   * This method validates:
   * - Zod schema (argument types and structure)
   *
   * @throws AppError - If schema validation fails or command not found
   */
  async execute(player: Player, commandName: string, args: string[]): Promise<void> {
    const entry = this.commands.get(commandName.toLowerCase())
    if (!entry) {
      loggers.command.error(`Handler not found for remote command: ${commandName}`, {
        command: commandName,
        resource: GetCurrentResourceName(),
      })
      throw new AppError('COMMAND:NOT_FOUND', `Command not found: ${commandName}`, 'server')
    }
    const { meta, handler } = entry
    return await validateAndExecuteCommand(meta, player, args, handler)
  }

  /**
   * Returns all commands registered in CORE (local + remote).
   */
  getAllCommands(): CommandInfo[] {
    return this.core.getAllCommands()
  }
}
