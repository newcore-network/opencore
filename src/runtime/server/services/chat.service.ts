import { injectable } from 'tsyringe'
import { Server } from '../../..'
import { RGB } from '../../../kernel/utils'

/**
 * Service for sending chat messages to players.
 *
 * @remarks
 * This service emits framework chat events over the network.
 */
@injectable()
export class ChatService {
  /**
   * Broadcast a chat message to all connected players.
   *
   * @param message - Message body.
   * @param author - Author label shown in chat. Defaults to `SYSTEM`.
   * @param color - Message color (RGB). Defaults to white.
   */
  broadcast(message: string, author: string = 'SYSTEM', color: RGB = { r: 255, g: 255, b: 255 }) {
    emitNet('core:chat:message', -1, {
      args: [author, message],
      color: color,
    })
  }

  /**
   * Send a private chat message to a single player.
   *
   * @param player - Target player.
   * @param message - Message body.
   * @param author - Author label shown in chat. Defaults to `Private`.
   * @param color - Message color (RGB).
   */
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

  /**
   * Clear chat for a single player.
   *
   * @param player - Target player.
   */
  clearChat(player: Server.Player) {
    emitNet('core:chat:clear', player.clientID)
  }

  // TODO: add send by group of players
}
