import { inject, injectable } from 'tsyringe'
import { INetTransport } from '../../../adapters/contracts/INetTransport'
import { RGB } from '../../../kernel/utils/rgb'
import { Server } from '..'
import { Channels } from './channel.api'

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
    @inject(INetTransport as any) private readonly netTransport: INetTransport,
    private readonly channelService: Channels,
  ) {}
  /**
   * Broadcast a chat message to all connected players.
   *
   * @param message - Message body.
   * @param author - Author label shown in chat. Defaults to `SYSTEM`.
   * @param color - Message color (RGB). Defaults to white.
   */
  broadcast(message: string, author: string = 'SYSTEM', color: RGB = { r: 255, g: 255, b: 255 }) {
    this.netTransport.emitNet('core:chat:message', 'all', {
      args: [author, message],
      color: color,
    })
  }

  /**
   * Get the ChannelService instance for advanced channel operations.
   *
   * @returns The ChannelService instance.
   */
  getChannelService(): Channels {
    return this.channelService
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
    this.netTransport.emitNet('core:chat:addMessage', player.clientID, {
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
    this.netTransport.emitNet('core:chat:clear', player.clientID)
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
    players: (Server.Player | number)[],
    message: string,
    author: string = 'SYSTEM',
    color: RGB = { r: 255, g: 255, b: 255 },
  ) {
    const targetIds = players.map((p) => (typeof p === 'number' ? p : p.clientID))
    this.netTransport.emitNet('core:chat:addMessage', targetIds, {
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
    playerFrom: Server.Player,
    message: string,
    radius: number,
    author: string = playerFrom.name,
    color: RGB = { r: 255, g: 255, b: 255 },
  ) {
    const channel = this.channelService.createProximityChannel(playerFrom, radius)
    if (!channel) return

    this.channelService.broadcast(channel.id, playerFrom, message, author, color)
    this.channelService.delete(channel.id)
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
    this.netTransport.emitNet('core:chat:clear', 'all')
  }
}
