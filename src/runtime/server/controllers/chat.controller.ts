import { inject } from 'tsyringe'
import { RGB } from '../../../kernel/utils/rgb'
import { Controller } from '../decorators/controller'
import { Export } from '../decorators/export'
import { Chat } from '../apis'
import { Players } from '../ports/players.api-port'

@Controller()
export class ChatController {
  constructor(
    private readonly chatService: Chat,
    @inject(Players as any) private readonly playerDirectory: Players,
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
    const players = this.playerDirectory.getMany(targets)
    for (let i = 0; i < players.length; i++) {
      this.chatService.sendPrivate(players[i], message, author, color)
    }
  }
}
