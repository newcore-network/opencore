import { inject } from 'tsyringe'
import { IEngineEvents } from '../../../adapters/contracts/IEngineEvents'
import { AppError, SecurityError } from '../../../kernel/error'
import { loggers } from '../../../kernel/logger'
import { CommandErrorObserverContract } from '../contracts/security/command-error-observer.contract'
import { Controller, Export, Public } from '../decorators'
import { OnNet } from '../decorators/onNet'
import { Player } from '../entities'
import { normalizeToAppError } from '../helpers/normalize-app-error'
import { getRuntimeContext } from '../runtime'
import { CommandExecutionPort, type CommandInfo } from '../ports/internal/command-execution.port'
import { Players } from '../ports/players.api-port'
import { Authorization } from '../ports/authorization.api-port'
import { RateLimiterService } from '../services/rate-limiter.service'
import {
  CommandRegistrationDto,
  InternalCommandsExports,
  SecurityMetadata,
} from '../types/core-exports.types'

/**
 * Command entry for resource-owned commands.
 */
interface RemoteCommandEntry {
  metadata: CommandRegistrationDto
  resourceName: string
}

/**
 * Export controller for command system (CORE mode only).
 *
 * @remarks
 * Exposes command registration and execution to RESOURCE mode instances.
 * Maintains a registry of both local and remote commands, delegating
 * remote command execution back to the owning resource via net events.
 */
@Controller()
export class CommandExportController implements InternalCommandsExports {
  private remoteCommands = new Map<string, RemoteCommandEntry>()

  constructor(
    private commandService: CommandExecutionPort,
    private playerDirectory: Players,
    private principalPort: Authorization,
    private rateLimiter: RateLimiterService,
    @inject(CommandErrorObserverContract as any)
    private readonly commandErrorObserver: CommandErrorObserverContract,
    @inject(IEngineEvents as any)
    private engineEvents: IEngineEvents,
  ) {}

  /**
   * Invokes the global {@link CommandErrorObserverContract} safely.
   *
   * @remarks
   * Observers are user-land code; failures must never break the command pipeline.
   */
  private async safeObserve(ctx: Parameters<CommandErrorObserverContract['onError']>[0]) {
    try {
      await this.commandErrorObserver.onError(ctx)
    } catch (e) {
      loggers.command.fatal(`Command error observer failed`, ctx as any, e as Error)
    }
  }

  // ═══════════════════════════════════════════════════════════════
  // Network Event Handler (receives commands from clients)
  // ═══════════════════════════════════════════════════════════════

  /**
   * Receives command execution requests from clients.
   *
   * @remarks
   * This is the entry point for all command execution in CORE mode.
   * Handles both local commands (registered in CORE) and remote commands
   * (registered by RESOURCE mode instances).
   */
  @Public()
  @OnNet('core:execute-command')
  async onCommandReceived(player: Player, command: string, args: string[]) {
    try {
      if (command.startsWith('/')) command = command.slice(1)

      // Basic input validation
      if (args.length > 10 || !/^[a-zA-Z0-9:_-]+$/.test(command)) {
        loggers.command.warn(`Rejected suspicious command: ${command}`, {
          playerId: player.clientID,
          playerName: player.name,
          accountID: player.accountID,
          args: args,
        })
        return
      }

      loggers.command.trace(`Received: /${command}`, {
        playerId: player.clientID,
        playerName: player.name,
      })

      // Use unified execution that handles both local and remote commands
      await this.executeCommand(player.clientID, command, args)
    } catch (error) {
      const runtime = getRuntimeContext()
      const remoteEntry = this.remoteCommands.get(command.toLowerCase())
      const localMeta = this.commandService.getCommandMeta(command)
      const appError = normalizeToAppError(error, 'server')

      // If we have an error and it's not a remote command, try to find local meta
      // to populate the error context properly for the observer.
      const commandInfo = localMeta
        ? {
            command: localMeta.command,
            description: localMeta.description,
            usage: localMeta.usage,
            isPublic: localMeta.isPublic,
            methodName: localMeta.methodName,
            expectsPlayer: localMeta.expectsPlayer,
            paramNames: localMeta.paramNames,
          }
        : remoteEntry
          ? {
              command: remoteEntry.metadata.command,
              description: remoteEntry.metadata.description,
              usage: remoteEntry.metadata.usage,
              isPublic: remoteEntry.metadata.isPublic,
            }
          : undefined

      const stage =
        error instanceof SecurityError
          ? 'security'
          : appError.code === 'AUTH:UNAUTHORIZED'
            ? 'auth'
            : appError.code === 'GAME:BAD_REQUEST' || appError.code.startsWith('SCHEMA:')
              ? 'validation'
              : appError.code === 'COMMAND:NOT_FOUND'
                ? 'dispatch'
                : 'unknown'

      await this.safeObserve({
        mode: runtime.mode,
        scope:
          runtime.mode === 'CORE'
            ? 'core'
            : runtime.mode === 'RESOURCE'
              ? 'resource'
              : 'standalone',
        stage,
        error: appError,
        commandName: command,
        args,
        player: {
          clientId: player.clientID,
          accountId: player.accountID || player.clientID.toString(),
          name: player.name,
        },
        playerRef: player,
        ownerResourceName: remoteEntry?.resourceName,
        command: commandInfo,
        commandMeta: localMeta,
      })
    }
  }

  // ═══════════════════════════════════════════════════════════════
  // Command Registration (for RESOURCE mode)
  // ═══════════════════════════════════════════════════════════════

  /**
   * Registers a command from a RESOURCE with CORE.
   *
   * @remarks
   * The command handler remains in the resource. CORE stores metadata
   * and delegates execution back to the resource when invoked.
   *
   * Exported as: `exports[coreResourceName].registerCommand`
   */
  @Export()
  registerCommand(metadata: CommandRegistrationDto): void {
    const commandKey = metadata.command.toLowerCase()

    const existing = this.remoteCommands.get(commandKey)
    if (existing) {
      // Allow re-registration from the same resource (hot-reload scenario)
      if (existing.resourceName === metadata.resourceName) {
        loggers.command.debug(
          `Re-registering command '${metadata.command}' from same resource (hot-reload)`,
          { command: metadata.command, resource: metadata.resourceName },
        )
        // Update the entry with new metadata
        this.remoteCommands.set(commandKey, {
          metadata,
          resourceName: metadata.resourceName,
        })
        return
      }

      loggers.command.warn(`Remote command '${metadata.command}' already registered`, {
        command: metadata.command,
        existingResource: existing.resourceName,
        newResource: metadata.resourceName,
      })
      return
    }

    this.remoteCommands.set(commandKey, {
      metadata,
      resourceName: metadata.resourceName,
    })

    const publicFlag = metadata.isPublic ? ' [Public]' : ''
    loggers.command.debug(
      `Registered remote command: /${metadata.command}${publicFlag} (owner: ${metadata.resourceName})`,
    )
  }

  /**
   * Executes a command (local or remote).
   *
   * @remarks
   * If the command is registered locally in CORE, executes it directly.
   * If it's a remote command, delegates to the owning resource via net event.
   *
   * Exported as: `exports[coreResourceName].executeCommand`
   */
  @Export()
  async executeCommand(clientID: number, commandName: string, args: string[]): Promise<void> {
    const player = this.playerDirectory.getByClient(clientID)
    if (!player) {
      throw new AppError('GAME:PLAYER_NOT_FOUND', `Player not found: ${clientID}`, 'core')
    }

    const commandKey = commandName.toLowerCase()
    const remoteEntry = this.remoteCommands.get(commandKey)

    if (remoteEntry) {
      // Validate security BEFORE delegating to resource
      await this.validateSecurity(player, commandName, remoteEntry.metadata.security)

      // Delegate to resource via local event (server-to-server, not network)
      const eventName = `opencore:command:execute:${remoteEntry.resourceName}`
      this.engineEvents.emit(eventName, clientID, commandName, args)
      loggers.command.debug(`Delegated remote command execution to ${remoteEntry.resourceName}`, {
        command: commandName,
        clientID,
        resource: remoteEntry.resourceName,
      })
      return
    }

    // Execute local command
    return await this.commandService.execute(player, commandName, args)
  }

  /**
   * Returns all registered commands (local + remote).
   *
   * Exported as: `exports[coreResourceName].getAllCommands`
   */
  @Export()
  getAllCommands(): CommandInfo[] {
    const localCommands = this.commandService.getAllCommands()
    const remoteCommandsInfo: CommandInfo[] = Array.from(this.remoteCommands.values()).map(
      (entry) => ({
        command: entry.metadata.command,
        description: entry.metadata.description,
        usage: entry.metadata.usage,
        isPublic: entry.metadata.isPublic,
      }),
    )

    return [...localCommands, ...remoteCommandsInfo]
  }

  /**
   * Validates security decorators before delegating to RESOURCE.
   *
   * @remarks
   * Validation order: @Guard → @Throttle → @RequiresState
   * Throws on first failure to prevent execution.
   *
   * @param player - Player executing the command
   * @param commandName - Command name (for rate limit key)
   * @param security - Security metadata from command decorators
   *
   * @throws AppError - If @Guard or @RequiresState validation fails
   * @throws SecurityError - If @Throttle rate limit is exceeded
   */
  private async validateSecurity(
    player: Player,
    commandName: string,
    security?: SecurityMetadata,
  ): Promise<void> {
    if (!security) return

    // 1. Validate @Guard (rank/permission)
    if (security.guard) {
      await this.principalPort.enforce(player, security.guard)
    }

    // 2. Validate @Throttle (rate limiting)
    if (security.throttle) {
      const { limit, windowMs, onExceed, message } = security.throttle
      const rateLimitKey = `${player.clientID}:remote:${commandName}`

      const allowed = this.rateLimiter.checkLimit(rateLimitKey, limit, windowMs)
      if (!allowed) {
        const errorMessage = message || `Rate limit exceeded for command: ${commandName}`
        if (onExceed === 'KICK') {
          DropPlayer(player.clientID.toString(), errorMessage)
        }
        throw new SecurityError(onExceed || 'LOG', errorMessage, { clientID: player.clientID })
      }
    }

    // 3. Validate @RequiresState (player state)
    if (security.requiresState) {
      const { has, missing, errorMessage } = security.requiresState

      if (has) {
        for (const state of has) {
          if (!player.hasState(state)) {
            throw new AppError(
              'GAME:INVALID_STATE',
              errorMessage || `Command requires state: ${state}`,
              'core',
            )
          }
        }
      }

      if (missing) {
        for (const state of missing) {
          if (player.hasState(state)) {
            throw new AppError(
              'GAME:INVALID_STATE',
              errorMessage || `Command cannot be used in state: ${state}`,
              'core',
            )
          }
        }
      }
    }
  }
}
