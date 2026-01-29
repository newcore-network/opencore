import { AppError } from '../../../kernel/error'
import { loggers } from '../../../kernel/logger'
import { RGB } from '../../../kernel/utils/rgb'
import { Controller, Export } from '../decorators'
import { OnRuntimeEvent } from '../decorators/onRuntimeEvent'
import { Channels } from '../apis/channel.api'
import { Players } from '../ports/players.api-port'
import { ChannelMetadata, ChannelType } from '../types/channel.types'

/**
 * Channel registration entry for resource-owned channels.
 */
interface RemoteChannelEntry {
  channelId: string
  resourceName: string
  metadata: ChannelMetadata
}

/**
 * Export controller for channel system (CORE mode only).
 *
 * @remarks
 * Exposes channel management to RESOURCE mode instances.
 * Maintains a centralized registry of channels across all resources,
 * allowing cross-resource communication via channels.
 */
@Controller()
export class ChannelExportController {
  private remoteChannels = new Map<string, RemoteChannelEntry>()

  constructor(
    private channels: Channels,
    private playerDirectory: Players,
  ) {}

  // ═══════════════════════════════════════════════════════════════
  // Channel Creation & Management
  // ═══════════════════════════════════════════════════════════════

  /**
   * Creates a channel in CORE from any resource.
   *
   * @remarks
   * The channel is stored centrally in CORE and accessible from all resources.
   *
   * Exported as: `exports[coreResourceName].createChannel`
   */
  @Export()
  createChannel(
    channelId: string,
    metadata: ChannelMetadata,
    maxSubscribers?: number,
    resourceName?: string,
  ): boolean {
    try {
      this.channels.create(channelId, metadata, maxSubscribers)

      if (resourceName) {
        this.remoteChannels.set(channelId, {
          channelId,
          resourceName,
          metadata,
        })
        loggers.api.debug(`Channel '${channelId}' created by resource '${resourceName}'`)
      } else {
        loggers.api.debug(`Channel '${channelId}' created locally`)
      }

      return true
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      loggers.api.warn(`Failed to create channel '${channelId}': ${message}`)
      return false
    }
  }

  /**
   * Gets or creates a channel in CORE.
   *
   * Exported as: `exports[coreResourceName].getOrCreateChannel`
   */
  @Export()
  getOrCreateChannel(
    channelId: string,
    metadata: ChannelMetadata,
    maxSubscribers?: number,
    resourceName?: string,
  ): boolean {
    try {
      this.channels.getOrCreate(channelId, metadata, maxSubscribers)

      if (resourceName && !this.remoteChannels.has(channelId)) {
        this.remoteChannels.set(channelId, {
          channelId,
          resourceName,
          metadata,
        })
      }

      return true
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      loggers.api.warn(`Failed to get/create channel '${channelId}': ${message}`)
      return false
    }
  }

  /**
   * Deletes a channel from CORE.
   *
   * Exported as: `exports[coreResourceName].deleteChannel`
   */
  @Export()
  deleteChannel(channelId: string): boolean {
    const deleted = this.channels.delete(channelId)
    if (deleted) {
      this.remoteChannels.delete(channelId)
      loggers.api.debug(`Channel '${channelId}' deleted`)
    }
    return deleted
  }

  /**
   * Checks if a channel exists in CORE.
   *
   * Exported as: `exports[coreResourceName].channelExists`
   */
  @Export()
  channelExists(channelId: string): boolean {
    return this.channels.exists(channelId)
  }

  // ═══════════════════════════════════════════════════════════════
  // Subscription Management
  // ═══════════════════════════════════════════════════════════════

  /**
   * Subscribes a player to a channel.
   *
   * Exported as: `exports[coreResourceName].subscribeToChannel`
   */
  @Export()
  subscribeToChannel(
    channelId: string,
    clientID: number,
    metadata?: Record<string, unknown>,
  ): boolean {
    try {
      const player = this.playerDirectory.getByClient(clientID)
      if (!player) {
        throw new AppError('GAME:PLAYER_NOT_FOUND', `Player not found: ${clientID}`, 'core')
      }

      return this.channels.subscribe(channelId, player, metadata)
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      loggers.api.warn(
        `Failed to subscribe player ${clientID} to channel '${channelId}': ${message}`,
      )
      return false
    }
  }

  /**
   * Unsubscribes a player from a channel.
   *
   * Exported as: `exports[coreResourceName].unsubscribeFromChannel`
   */
  @Export()
  unsubscribeFromChannel(channelId: string, clientID: number): boolean {
    const player = this.playerDirectory.getByClient(clientID)
    if (!player) return false

    return this.channels.unsubscribe(channelId, player)
  }

  /**
   * Checks if a player is subscribed to a channel.
   *
   * Exported as: `exports[coreResourceName].isSubscribedToChannel`
   */
  @Export()
  isSubscribedToChannel(channelId: string, clientID: number): boolean {
    const player = this.playerDirectory.getByClient(clientID)
    if (!player) return false

    return this.channels.isSubscribed(channelId, player)
  }

  /**
   * Gets subscriber count for a channel.
   *
   * Exported as: `exports[coreResourceName].getChannelSubscriberCount`
   */
  @Export()
  getChannelSubscriberCount(channelId: string): number {
    const channel = this.channels.get(channelId)
    return channel ? channel.getSubscriberCount() : 0
  }

  /**
   * Gets all subscriber client IDs for a channel.
   *
   * Exported as: `exports[coreResourceName].getChannelSubscribers`
   */
  @Export()
  getChannelSubscribers(channelId: string): number[] {
    const subscribers = this.channels.getSubscribers(channelId)
    return subscribers.map((p) => p.clientID)
  }

  // ═══════════════════════════════════════════════════════════════
  // Broadcasting
  // ═══════════════════════════════════════════════════════════════

  /**
   * Broadcasts a message to all subscribers of a channel.
   *
   * Exported as: `exports[coreResourceName].broadcastToChannel`
   */
  @Export()
  broadcastToChannel(
    channelId: string,
    senderClientID: number,
    message: string,
    author?: string,
    color?: RGB,
  ): boolean {
    try {
      const sender = this.playerDirectory.getByClient(senderClientID)
      if (!sender) {
        throw new AppError('GAME:PLAYER_NOT_FOUND', `Sender not found: ${senderClientID}`, 'core')
      }

      this.channels.broadcast(channelId, sender, message, author, color)
      return true
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      loggers.api.warn(`Failed to broadcast to channel '${channelId}': ${message}`)
      return false
    }
  }

  /**
   * Broadcasts a system message to all subscribers of a channel.
   *
   * Exported as: `exports[coreResourceName].broadcastSystemToChannel`
   */
  @Export()
  broadcastSystemToChannel(
    channelId: string,
    message: string,
    author?: string,
    color?: RGB,
  ): boolean {
    try {
      this.channels.broadcastSystem(channelId, message, author, color)
      return true
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      loggers.api.warn(`Failed to broadcast system message to channel '${channelId}': ${message}`)
      return false
    }
  }

  // ═══════════════════════════════════════════════════════════════
  // Specialized Channel Creation
  // ═══════════════════════════════════════════════════════════════

  /**
   * Creates a proximity channel around a player.
   *
   * Exported as: `exports[coreResourceName].createProximityChannel`
   */
  @Export()
  createProximityChannel(
    originClientID: number,
    radius: number,
    channelId?: string,
  ): string | null {
    const originPlayer = this.playerDirectory.getByClient(originClientID)
    if (!originPlayer) return null

    const channel = this.channels.createProximityChannel(originPlayer, radius, channelId)
    return channel ? channel.id : null
  }

  /**
   * Creates a private channel for specific players.
   *
   * Exported as: `exports[coreResourceName].createPrivateChannel`
   */
  @Export()
  createPrivateChannel(clientIDs: number[], metadata: ChannelMetadata): string | null {
    const players = clientIDs
      .map((id) => this.playerDirectory.getByClient(id))
      .filter((p) => p !== undefined)

    if (players.length === 0) return null

    const channel = this.channels.createPrivate(players, metadata)
    return channel.id
  }

  // ═══════════════════════════════════════════════════════════════
  // Query & Introspection
  // ═══════════════════════════════════════════════════════════════

  /**
   * Gets all channel IDs by type.
   *
   * Exported as: `exports[coreResourceName].getChannelsByType`
   */
  @Export()
  getChannelsByType(type: ChannelType): string[] {
    const channels = this.channels.getChannelsByType(type)
    return channels.map((c) => c.id)
  }

  /**
   * Gets all channel IDs a player is subscribed to.
   *
   * Exported as: `exports[coreResourceName].getPlayerChannels`
   */
  @Export()
  getPlayerChannels(clientID: number): string[] {
    const player = this.playerDirectory.getByClient(clientID)
    if (!player) return []

    const channels = this.channels.getChannelsByPlayer(player)
    return channels.map((c) => c.id)
  }

  /**
   * Gets all channel IDs.
   *
   * Exported as: `exports[coreResourceName].getAllChannels`
   */
  @Export()
  getAllChannels(): string[] {
    const channels = this.channels.getAllChannels()
    return channels.map((c) => c.id)
  }

  // ═══════════════════════════════════════════════════════════════
  // Resource Cleanup
  // ═══════════════════════════════════════════════════════════════

  /**
   * Cleans up channels owned by a resource when it stops.
   */
  @OnRuntimeEvent('onServerResourceStop')
  onResourceStop(resourceName: string) {
    const channelsToDelete: string[] = []

    for (const [channelId, entry] of this.remoteChannels.entries()) {
      if (entry.resourceName === resourceName) {
        channelsToDelete.push(channelId)
      }
    }

    if (channelsToDelete.length > 0) {
      loggers.api.info(
        `Cleaning up ${channelsToDelete.length} channels from stopped resource '${resourceName}'`,
      )

      for (const channelId of channelsToDelete) {
        this.channels.delete(channelId)
        this.remoteChannels.delete(channelId)
      }
    }
  }
}
