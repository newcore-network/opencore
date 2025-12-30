import { inject, injectable } from 'tsyringe'
import { IEngineEvents } from '../../../adapters/contracts/IEngineEvents'
import { IResourceInfo } from '../../../adapters/contracts/IResourceInfo'
import { AppError } from '../../../kernel'
import { loggers } from '../../../kernel/shared/logger'
import { Controller } from '../decorators'
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
@injectable()
@Controller()
export class RemoteCommandExecutionController {
  constructor(
    private commandService: CommandExecutionPort,
    private playerDirectory: PlayerDirectoryPort,
    @inject(IEngineEvents as any) private engineEvents: IEngineEvents,
    @inject(IResourceInfo as any) private resourceInfo: IResourceInfo,
  ) {
    this.registerEventHandler()
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
    const player = this.playerDirectory.getByClient(clientID)

    if (!player) {
      loggers.command.warn(`Command execution failed: player not found`, {
        command: commandName,
        clientID,
      })
      return
    }

    try {
      await this.commandService.execute(player, commandName, args)
    } catch (error) {
      if (error instanceof AppError) {
        player.send(error.message)
      }
      loggers.command.error(`Remote command execution failed`, {
        command: commandName,
        clientID: player.clientID,
        error: error instanceof Error ? error.message : String(error),
      })
    }
  }
}
