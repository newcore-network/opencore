import { inject } from 'tsyringe'
import { IEngineEvents } from '../../../adapters/contracts/IEngineEvents'
import { IResourceInfo } from '../../../adapters/contracts/IResourceInfo'
import { loggers } from '../../../kernel/logger'
import { CommandErrorObserverContract } from '../contracts/security/command-error-observer.contract'
import { Controller } from '../decorators'
import { normalizeToAppError } from '../helpers/normalize-app-error'
import { getRuntimeContext } from '../runtime'
import { CommandExecutionPort } from '../services/ports/command-execution.port'
import { PlayerDirectoryPort } from '../services/ports/player-directory.port'

/**
 * Controller for executing remote commands in RESOURCE mode.
 *
 * @remarks
 * Listens for command execution events from CORE and invokes
 * the local handler stored in RemoteCommandService.
 *
 * Flow:
 * 1. Player executes command → sent to CORE
 * 2. CORE validates and emits local event to owning resource
 * 3. This controller receives event → looks up handler → executes
 *
 * @note Uses IEngineEvents.on() (local event) not @OnNet (network event)
 * because CORE→RESOURCE communication is server-to-server.
 * Event registration happens in constructor via adapter layer.
 */
@Controller()
export class RemoteCommandExecutionController {
  constructor(
    @inject(CommandExecutionPort as any) private commandService: CommandExecutionPort,
    @inject(PlayerDirectoryPort as any) private playerDirectory: PlayerDirectoryPort,
    @inject(CommandErrorObserverContract as any)
    private readonly commandErrorObserver: CommandErrorObserverContract,
    @inject(IEngineEvents as any) private engineEvents: IEngineEvents,
    @inject(IResourceInfo as any) private resourceInfo: IResourceInfo,
  ) {
    this.registerEventHandler()
  }

  /**
   * Invokes the global {@link CommandErrorObserverContract} safely.
   *
   * @remarks
   * Observers are user-land code; failures must never break command execution.
   */
  private async safeObserve(ctx: Parameters<CommandErrorObserverContract['onError']>[0]) {
    try {
      await this.commandErrorObserver.onError(ctx)
    } catch (e) {
      loggers.command.fatal(`Command error observer failed`, ctx as any, e as Error)
    }
  }

  /**
   * Registers the event handler for command execution from CORE.
   *
   * @remarks
   * Event format: `opencore:command:execute:{resourceName}`
   * Uses adapter layer instead of direct FiveM globals.
   */
  private registerEventHandler(): void {
    const resourceName = this.resourceInfo.getCurrentResourceName()
    const eventName = `opencore:command:execute:${resourceName}`

    this.engineEvents.on(
      eventName,
      async (clientID: number, commandName: string, args: string[]) => {
        await this.handleCommandExecution(clientID, commandName, args)
      },
    )

    loggers.command.debug(`Registered remote command handler for resource: ${resourceName}`)
  }

  /**
   * Handles command execution requests from CORE.
   *
   * @param clientID - The client ID of the player executing the command
   * @param commandName - The command to execute
   * @param args - Command arguments
   */
  private async handleCommandExecution(
    clientID: number,
    commandName: string,
    args: string[],
  ): Promise<void> {
    loggers.command.debug(`Received command execution request`, {
      command: commandName,
      clientID,
      args,
    })

    const player = this.playerDirectory.getByClient(clientID)

    if (!player) {
      loggers.command.warn(`Command execution failed: player not found`, {
        command: commandName,
        clientID,
      })
      return
    }

    loggers.command.debug(`Executing command for player`, {
      command: commandName,
      playerName: player.name,
      clientID,
    })

    try {
      await this.commandService.execute(player, commandName, args)
      loggers.command.debug(`Command executed successfully`, {
        command: commandName,
        clientID,
      })
    } catch (error) {
      // Do not notify the player here. Report through the global observer.
      const runtime = getRuntimeContext()
      const appError = normalizeToAppError(error, 'server')
      const meta = this.commandService.getCommandMeta(commandName)

      const stage =
        appError.code === 'GAME:BAD_REQUEST' || appError.code.startsWith('SCHEMA:')
          ? 'validation'
          : appError.code === 'COMMAND:NOT_FOUND'
            ? 'dispatch'
            : 'handler'

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
        commandName,
        args,
        player: {
          clientId: player.clientID,
          accountId: player.accountID,
          name: player.name,
        },
        playerRef: player,
        command: meta
          ? {
              command: meta.command,
              description: meta.description,
              usage: meta.usage,
              isPublic: meta.isPublic,
              methodName: meta.methodName,
              expectsPlayer: meta.expectsPlayer,
              paramNames: meta.paramNames,
            }
          : undefined,
        commandMeta: meta,
        ownerResourceName: this.resourceInfo.getCurrentResourceName(),
      })
    }
  }
}
