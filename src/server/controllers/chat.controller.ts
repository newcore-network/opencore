import { RGB } from '../../utils'
import { Controller } from '../decorators/controller'
import { Export } from '../decorators/export'
import { ChatService } from '../services/chat.service'
import { PlayerServiceContract } from '../services/contracts/player.service.contract'

@Controller()
export class ChatController {
  constructor(
    private readonly chatService: ChatService,
    private readonly playerService: PlayerServiceContract,
  ) {}

  @Export()
  coreBroadcast(
    message: string,
    author: string = 'SYSTEM',
    color: RGB = { r: 255, g: 255, b: 255 },
  ) {
    this.chatService.broadcast(message, author, color)
  }

  @Export()
  coreSendPrivate(targetId: number, message: string, author: string = 'Private') {
    const player = this.playerService.getByClient(targetId)
    if (!player) {
      throw new Error(`Player with client ID ${targetId} not found`)
    }
    this.chatService.sendPrivate(player, message, author)
  }

  // TODO: add send by group of players
}
