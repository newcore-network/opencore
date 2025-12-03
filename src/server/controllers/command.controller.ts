import { OnNet } from '../decorators/netEvent'
import { CommandService } from '../services/command.service'
import { Player } from '../entities'
import { Controller } from '../decorators'
import { loggers } from '../../shared/logger'

@Controller()
export class CommandNetworkController {
  constructor(private readonly commandService: CommandService) {}

  @OnNet('core:internal:executeCommand')
  async onCommandReceived(player: Player, commandName: string, args: string[], raw: string) {
    try {
      loggers.command.trace(`Received: /${commandName}`, {
        playerId: player.clientID,
        playerName: player.name,
      })
      await this.commandService.execute(player, commandName, args, raw)
    } catch (error) {
      loggers.command.error(
        `Execution failed: /${commandName}`,
        {
          playerId: player.clientID,
        },
        error as Error,
      )
    }
  }
}
