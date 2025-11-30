import { injectable } from 'tsyringe'
import { Server } from '../..'

@injectable()
export class ChatService {
  broadcast(message: string, author: string = 'SYSTEM', color: RGB = { r: 255, g: 255, b: 255 }) {
    emitNet('core:chat:message', -1, {
      args: [author, message],
      color: color,
    })
  }

  sendPrivate(
    player: Server.Player,
    message: string,
    author: string = 'Private',
    color: RGB = { r: 200, g: 200, b: 200 },
  ) {
    emitNet('core:chat:addMessage', player.clientID, {
      args: [author, message],
      color: color,
    })
  }

  clearChat(player: Server.Player) {
    emitNet('core:chat:clear', player.clientID)
  }
}
