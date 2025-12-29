import { RGB } from '../../../kernel/utils'
import { Controller } from '../decorators/controller'
import { Export } from '../decorators/export'
import { ChatService } from '../services/chat.service'
import { PlayerDirectoryPort } from '../services/ports/player-directory.port'

@Controller()
export class ChatController {
  constructor(
    private readonly chatService: ChatService,
    private readonly playerDirectory: PlayerDirectoryPort,
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
    const player = this.playerDirectory.getByClient(targetId)
    if (!player) {
      throw new Error(`Player with client ID ${targetId} not found`)
    }
    this.chatService.sendPrivate(player, message, author)
  }

  @Export()
  coreSendToGroupOfPlayers(
    targets: number[],
    message: string,
    author: string = 'Private',
    color?: RGB,
  ) {
    this.playerDirectory.getMany(targets).map((p) => {
      this.chatService.sendPrivate(p, message, author, color)
    })
  }
}
