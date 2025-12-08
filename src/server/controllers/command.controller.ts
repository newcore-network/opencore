import { OnNet } from '../decorators/onNet'
import { CommandService } from '../services/command.service'
import { Player } from '../entities'
import { Controller } from '../decorators'
import { loggers } from '../../shared/logger'

@Controller()
export class CommandNetworkController {
  constructor(private readonly commandService: CommandService) {}

  @OnNet('core:internal:executeCommand')
  async onCommandReceived(player: Player, command: string, args: string[], raw: string) {
    try {
      loggers.command.trace(`Received: /${command}`, {
        playerId: player.clientID,
        playerName: player.name,
      })
      await this.commandService.execute(player, command, args, raw)
    } catch (error) {
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
