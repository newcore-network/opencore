import { OnNet } from '../decorators/netEvent'
import { CommandService } from '../services/command.service'
import { Player } from '../entities'
import { Controller } from '../decorators'

@Controller()
export class CommandNetworkController {
  constructor(private readonly commandService: CommandService) {}

  @OnNet('core:internal:executeCommand')
  async onCommandReceived(player: Player, commandName: string, args: string[], raw: string) {
    try {
      console.log(`[DEBUG] commando received /${commandName} from ${player.name}`)
      await this.commandService.execute(player, commandName, args, raw)
    } catch (error) {
      console.error(error)
    }
  }
}
