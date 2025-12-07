import { OnNet } from '../decorators/onNet'
import { CommandService } from '../services/command.service'
import { Player } from '../entities'
import { Controller } from '../decorators'
import { loggers } from '../../shared/logger'
import {z} from 'zod'

const schema = z.object({
  commandName: z.string(),
  args: z.array(z.string()),
  raw: z.string(),
})

@Controller()
export class CommandNetworkController {
  constructor(private readonly commandService: CommandService) {}

  @OnNet('core:internal:executeCommand', schema)
  async onCommandReceived(player: Player, args: z.infer<typeof schema>) {
    try {
      loggers.command.trace(`Received: /${args.commandName}`, {
        playerId: player.clientID,
        playerName: player.name,
      })
      await this.commandService.execute(player, args.commandName, args.args, args.raw)
    } catch (error) {
      loggers.command.error(
        `Execution failed: /${args.commandName}`,  
        {
          playerId: player.clientID,
        },
        error as Error,
      )
    }
  }
}
