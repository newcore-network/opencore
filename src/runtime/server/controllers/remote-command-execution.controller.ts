import { Controller, OnNet } from '../decorators'
import { CommandExecutionPort } from '../services/ports/command-execution.port'
import { PlayerDirectoryPort } from '../services/ports/player-directory.port'
import { Player } from '../entities'
import { loggers } from '../../../kernel/shared/logger'

/**
 * Controller for executing remote commands in RESOURCE mode.
 *
 * @remarks
 * Listens for command execution events from CORE and invokes
 * the local handler stored in RemoteCommandService.
 *
 * Flow:
 * 1. Player executes command → sent to CORE
 * 2. CORE validates and emits event to owning resource
 * 3. This controller receives event → looks up handler → executes
 */
@Controller()
export class RemoteCommandExecutionController {
  constructor(
    private commandService: CommandExecutionPort,
    private playerDirectory: PlayerDirectoryPort,
  ) {}

  /**
   * Handles command execution requests from CORE.
   *
   * @remarks
   * Event format: `opencore:command:execute:{resourceName}`
   * CORE emits this event to the specific resource that owns the command.
   */
  @OnNet(`opencore:command:execute:${GetCurrentResourceName()}`)
  async handleCommandExecution(player: Player, commandName: string, args: string[]) {
    if (!player) {
      loggers.command.warn(`Command execution failed: player not found`, {
        command: commandName,
      })
      return
    }

    try {
      await this.commandService.execute(player, commandName, args)
    } catch (error) {
      loggers.command.error(`Remote command execution failed`, {
        command: commandName,
        clientID: player.clientID,
        error: error instanceof Error ? error.message : String(error),
      })
    }
  }
}
