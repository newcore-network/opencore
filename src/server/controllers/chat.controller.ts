import { OnNet } from '../decorators/netEvent'
import { CommandService } from '../services/command.service'
import { PlayerService } from '../services/player.service'
import { Player } from '../entities'
import { Controller } from '../decorators'

@Controller()
export class CommandNetworkController {
  constructor(
    private commandService: CommandService,
    private playerManager: PlayerService,
  ) {}

  @OnNet('core:internal:executeCommand')
  async onCommandReceived(player: Player, commandName: string, args: string[], raw: string) {
    try {
      console.log(`[DEBUG] commando received /${commandName} from ${player.name}`)
      await this.commandService.execute(player.clientID, commandName, args, raw)
    } catch (error) {
      console.error(error)
    }
  }
}
