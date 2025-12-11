import { OnNet } from '../decorators/onNet'
import { CommandService } from '../services/command.service'
import { Player } from '../entities'
import { Controller } from '../decorators'
import { loggers } from '../../shared/logger'
import { AppError } from '../../utils'

@Controller()
export class CommandNetworkController {
  constructor(private readonly commandService: CommandService) {}

  @OnNet('core:execute-command')
  async onCommandReceived(player: Player, command: string, args: string[]) {
    try {
      if (command.startsWith('/')) command = command.slice(1)

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
        if (error.code === 'VALIDATION_ERROR' || error.code === 'COMMAND_NOT_FOUND')
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
