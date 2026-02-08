import { inject, injectable } from 'tsyringe'
import { EventsAPI } from '../../../adapters/contracts/transport/events.api'
import { RGB } from '../../../kernel/utils/rgb'
import { Player } from '../entities/player'
import { Players } from '../ports/players.api-port'

/**
 * Service for sending chat messages to players.
 *
 * @remarks
 * This service emits framework chat events over the network.
 * Internally uses ChannelService for advanced channel-based communication.
 */
@injectable()
export class Chat {
  constructor(
    @inject(EventsAPI as any) private readonly events: EventsAPI<'server'>,
    private readonly players: Players,
  ) {}
  /**
   * Broadcast a chat message to all connected players.
   *
   * @param message - Message body.
   * @param author - Author label shown in chat. Defaults to `SYSTEM`.
   * @param color - Message color (RGB). Defaults to white.
   */
  broadcast(message: string, author: string = 'SYSTEM', color: RGB = { r: 255, g: 255, b: 255 }) {
    this.events.emit('core:chat:message', 'all', {
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
    player: Player,
    message: string,
    author: string = 'Private',
    color: RGB = { r: 200, g: 200, b: 200 },
  ) {
    this.events.emit('core:chat:addMessage', player.clientID, {
      args: [author, message],
      color: color,
    })
  }

  /**
   * Clear chat for a single player.
   *
   * @param player - Target player.
   */
  clearChat(player: Player) {
    this.events.emit('core:chat:clear', player.clientID)
  }

  /**
   * Send a chat message to multiple players.
   *
   * @param players - Array of target players or their client IDs.
   * @param message - Message body.
   * @param author - Author label.
   * @param color - Message color (RGB).
   */
  sendMany(
    players: (Player | number)[],
    message: string,
    author: string = 'SYSTEM',
    color: RGB = { r: 255, g: 255, b: 255 },
  ) {
    const targetIds = players.map((p) => (typeof p === 'number' ? p : p.clientID))
    this.events.emit('core:chat:addMessage', targetIds, {
      args: [author, message],
      color: color,
    })
  }

  /**
   * Send a chat message to players within a certain radius of a specific player.
   *
   * @param playerFrom - Origin player.
   * @param message - Message body.
   * @param radius - Distance radius in game units.
   * @param author - Author label.
   * @param color - Message color (RGB).
   */
  sendNearby(
    playerFrom: Player,
    message: string,
    radius: number,
    author: string = playerFrom.name,
    color: RGB = { r: 255, g: 255, b: 255 },
  ) {
    const originPos = playerFrom.getPosition()
    if (!originPos) return

    const allPlayers = this.players.getAll()
    const nearbyPlayers = allPlayers.filter((p) => {
      const pos = p.getPosition()
      if (!pos) return false

      const dx = originPos.x - pos.x
      const dy = originPos.y - pos.y
      const dz = originPos.z - pos.z
      const distance = Math.sqrt(dx * dx + dy * dy + dz * dz)

      return distance <= radius
    })

    this.sendMany(nearbyPlayers, message, author, color)
  }

  /**
   * Broadcast a system message to all players.
   *
   * @param message - Message body.
   * @param color - Message color (RGB). Defaults to a light blue/cyan.
   */
  broadcastSystem(message: string, color: RGB) {
    this.broadcast(message, 'SYSTEM', color)
  }

  /**
   * Clear chat for all connected players.
   */
  clearChatAll() {
    this.events.emit('core:chat:clear', 'all')
  }
}
