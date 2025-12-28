import { injectable, inject } from 'tsyringe'
import { CommandMetadata } from '../../decorators/command'
import { getRuntimeContext } from '../../runtime'
import { CommandExecutionPort, type CommandInfo } from '../ports/command-execution.port'
import type { CoreExports } from '../../types/core-exports'
import { Player } from '../../entities'
import { loggers } from '../../../../kernel/shared/logger'
import { IExports } from '../../../../adapters/contracts/IExports'

/**
 * Remote command service for RESOURCE mode.
 *
 * @remarks
 * In RESOURCE mode, this service:
 * - Stores command handlers locally in the resource
 * - Registers command metadata with CORE via exports
 * - Executes handlers when invoked by CORE via net event
 *
 * Flow:
 * 1. Resource declares @Command → metadata registered with CORE
 * 2. Player executes command → CORE validates and emits event to resource
 * 3. Resource receives event → looks up local handler → executes
 */
@injectable()
export class RemoteCommandService extends CommandExecutionPort {
  private handlers = new Map<string, Function>()

  constructor(@inject(IExports as any) private exportsService: IExports) {
    super()
  }

  /**
   * Gets typed access to CORE resource exports.
   */
  private get core(): CoreExports {
    const { coreResourceName } = getRuntimeContext()
    const coreExports = this.exportsService.getResource<CoreExports>(coreResourceName)

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
   * The handler is stored locally in this resource, while metadata is sent to CORE.
   * CORE maintains the command registry and delegates execution back to this resource.
   */
  register(metadata: CommandMetadata, handler: Function): void {
    // Store handler locally
    this.handlers.set(metadata.command.toLowerCase(), handler)

    // Register metadata with CORE (including security)
    this.core.registerCommand({
      command: metadata.command,
      description: metadata.description,
      usage: metadata.usage,
      isPublic: metadata.isPublic ?? false,
      resourceName: GetCurrentResourceName(),
      security: metadata.security, // Transmit security metadata
    })

    const publicFlag = metadata.isPublic ? ' [Public]' : ''
    const securityFlags = []
    if (metadata.security?.guard) securityFlags.push('Guard')
    if (metadata.security?.throttle) securityFlags.push('Throttle')
    if (metadata.security?.requiresState) securityFlags.push('RequiresState')
    const securityInfo = securityFlags.length > 0 ? ` (${securityFlags.join(', ')})` : ''

    loggers.command.debug(
      `Registered remote command: /${metadata.command}${publicFlag}${securityInfo} (delegated to CORE)`,
    )
  }

  /**
   * Executes a command handler stored in this resource.
   *
   * @remarks
   * Called by the resource's command execution controller when CORE
   * emits a command execution event to this resource.
   */
  async execute(player: Player, commandName: string, args: string[]): Promise<void> {
    const handler = this.handlers.get(commandName.toLowerCase())
    if (!handler) {
      loggers.command.error(`Handler not found for remote command: ${commandName}`, {
        command: commandName,
        resource: GetCurrentResourceName(),
      })
      return
    }

    // Execute local handler
    return await handler(player, ...args)
  }

  /**
   * Returns all commands registered in CORE (local + remote).
   */
  getAllCommands(): CommandInfo[] {
    return this.core.getAllCommands()
  }
}
