import { OnNet } from '../decorators/onNet'
import { CommandExecutionPort } from '../services/ports/command-execution.port'
import { Player } from '../entities'
import { Controller, Public } from '../decorators'
import { loggers } from '../../../kernel/shared/logger'
import { AppError } from '../../../kernel/utils'

/**
 * Network controller for command execution.
 *
 * @remarks
 * Receives command execution requests from clients and delegates to CommandExecutionPort.
 * In CORE mode, executes commands directly or delegates to owning resource.
 * In RESOURCE mode, delegates to CORE via exports.
 */
@Controller()
export class CommandNetworkController {
  constructor(private readonly commandService: CommandExecutionPort) {}

  @Public()
  @OnNet('core:execute-command')
  async onCommandReceived(player: Player, command: string, args: string[]) {
    try {
      if (command.startsWith('/')) command = command.slice(1)
      if (!player.clientID || player.clientID === null || player.clientID === undefined) {
        console.log('DEBUG; Player entity not received in core:execute-command')
      }
      if (args.length > 10 || !/^[a-zA-Z0-9:_-]+$/.test(command)) {
        loggers.command.warn(`Rejected suspicious command: ${command}`, {
          playerId: player.clientID,
          playerName: player.name,
        })
        return
      }

      loggers.command.trace(`Received: /${command}`, {
        playerId: player.clientID,
        playerName: player.name,
      })

      await this.commandService.execute(player, command, args)
    } catch (error) {
      if (error instanceof AppError) {
        if (error.code === 'GAME:BAD_REQUEST' || error.code === 'COMMAND:NOT_FOUND')
          player.send(error.message, 'error')
        else player.send('An error occurred while executing the command', 'error')

        loggers.command.error(
          `Execution failed: /${command}`,
          {
            playerId: player.clientID,
          },
          error as Error,
        )
      }
    }
  }
}
