import { inject, injectable } from 'tsyringe'
import { INetTransport } from '../../../adapters/contracts/INetTransport'
import { RGB } from '../../../kernel/utils/rgb'
import { Channel } from '../entities/channel'
import { Player } from '../entities/player'
import { ChannelMetadata, ChannelType, IChannelValidator } from '../types/channel.types'
import { Players } from '../ports/players.api-port'

/**
 * Service for managing communication channels between players.
 *
 * @remarks
 * Channels provide group-based communication with subscription management.
 * In CORE mode, channels are managed locally. In RESOURCE mode, all operations
 * are delegated to CORE via exports for centralized state management.
 *
 * **Architecture:**
 * - CORE mode: Manages all channel state locally
 * - RESOURCE mode: Delegates to CORE via exports (uses RemoteChannelImplementation)
 * - STANDALONE mode: Same as CORE
 *
 * **Channel Types:**
 * - Persistent: Long-lived channels (groups, radios, admin)
 * - Temporary: Short-lived channels (proximity, private messages)
 *
 * @example
 * ```typescript
 * // Create a group channel
 * const channel = channels.create('group:police', {
 *   type: ChannelType.group,
 *   persistent: true
 * })
 *
 * // Subscribe a player
 * channels.subscribe('group:police', player)
 *
 * // Broadcast to all subscribers
 * channels.broadcast('group:police', player, 'Hello group!')
 * ```
 */
@injectable()
export class Channels {
  private channels: Map<string, Channel> = new Map()
  private validator?: IChannelValidator

  constructor(
    private readonly playerDirectory: Players,
    @inject(INetTransport as any) private readonly netTransport: INetTransport,
  ) {}

  /**
   * Sets a custom validator for channel operations.
   *
   * @remarks
   * Validators control who can subscribe to channels and who can broadcast messages.
   * Only works in CORE/STANDALONE mode. In RESOURCE mode, validators must be set in CORE.
   *
   * @param validator - Custom validator implementing IChannelValidator
   *
   * @example
   * ```typescript
   * channels.setValidator({
   *   canSubscribe: (player, channelId) => {
   *     return !player.hasState('banned')
   *   },
   *   canBroadcast: (player, channelId) => {
   *     return !player.hasState('muted')
   *   }
   * })
   * ```
   */
  setValidator(validator: IChannelValidator): void {
    this.validator = validator
  }

  /**
   * Creates a new channel.
   *
   * @param id - Unique channel identifier (e.g., 'group:police', 'radio:100')
   * @param metadata - Channel configuration (type, persistence, etc.)
   * @param maxSubscribers - Optional maximum number of subscribers
   * @returns The created channel
   * @throws Error if channel with the same ID already exists
   *
   * @example
   * ```typescript
   * const channel = channels.create('radio:100', {
   *   type: ChannelType.RADIO,
   *   frequency: 100,
   *   persistent: true
   * })
   * ```
   */
  create(id: string, metadata: ChannelMetadata, maxSubscribers?: number): Channel {
    if (this.channels.has(id)) {
      throw new Error(`Channel with id '${id}' already exists`)
    }

    const channel = new Channel(id, metadata, maxSubscribers)
    this.channels.set(id, channel)

    return channel
  }

  /**
   * Creates a private channel for specific players.
   *
   * @remarks
   * Automatically subscribes all provided players to the channel.
   * Channel ID is auto-generated and non-persistent.
   *
   * @param players - Array of players to include in the private channel
   * @param metadata - Channel configuration (type should be PRIVATE)
   * @returns The created private channel with all players subscribed
   *
   * @example
   * ```typescript
   * const privateChannel = channels.createPrivate([player1, player2], {
   *   type: ChannelType.PRIVATE,
   *   persistent: false
   * })
   * channels.broadcast(privateChannel.id, player1, 'Private message')
   * ```
   */
  createPrivate(players: Player[], metadata: ChannelMetadata): Channel {
    const id = `private:${Date.now()}:${Math.random().toString(36).substring(7)}`
    const channel = this.create(id, { ...metadata, persistent: false }, players.length)

    for (const player of players) {
      channel.subscribe(player)
    }

    return channel
  }

  /**
   * Gets a channel by ID.
   *
   * @param id - Channel identifier
   * @returns The channel if found, undefined otherwise
   */
  get(id: string): Channel | undefined {
    return this.channels.get(id)
  }

  /**
   * Gets an existing channel or creates it if it doesn't exist.
   *
   * @param id - Channel identifier
   * @param metadata - Channel configuration (used only if creating)
   * @param maxSubscribers - Optional maximum subscribers (used only if creating)
   * @returns The existing or newly created channel
   *
   * @example
   * ```typescript
   * // Safe way to ensure a channel exists
   * const radio = channels.getOrCreate('radio:100', {
   *   type: ChannelType.RADIO,
   *   persistent: true
   * })
   * ```
   */
  getOrCreate(id: string, metadata: ChannelMetadata, maxSubscribers?: number): Channel {
    const existing = this.channels.get(id)
    if (existing) {
      return existing
    }

    return this.create(id, metadata, maxSubscribers)
  }

  /**
   * Deletes a channel and clears all its subscribers.
   *
   * @param id - Channel identifier
   * @returns true if channel was deleted, false if it didn't exist
   *
   * @example
   * ```typescript
   * // Clean up temporary channel after use
   * const proximity = channels.createProximityChannel(player, 50)
   * channels.broadcast(proximity.id, player, 'Hello nearby!')
   * channels.delete(proximity.id)
   * ```
   */
  delete(id: string): boolean {
    const channel = this.channels.get(id)
    if (!channel) {
      return false
    }

    channel.clear()
    return this.channels.delete(id)
  }

  /**
   * Checks if a channel exists.
   *
   * @param id - Channel identifier
   * @returns true if channel exists, false otherwise
   */
  exists(id: string): boolean {
    return this.channels.has(id)
  }

  /**
   * Subscribes a player to a channel.
   *
   * @remarks
   * If a validator is set, it will be checked before subscribing.
   * Players can only be subscribed once to the same channel.
   *
   * @param channelId - Channel identifier
   * @param player - Player to subscribe
   * @param metadata - Optional subscription metadata
   * @returns true if subscribed successfully, false if validation failed or already subscribed
   * @throws Error if channel doesn't exist
   *
   * @example
   * ```typescript
   * if (channels.subscribe('group:police', player)) {
   *   // Player joined the group channel
   * }
   * ```
   */
  subscribe(channelId: string, player: Player, metadata?: Record<string, unknown>): boolean {
    const channel = this.channels.get(channelId)
    if (!channel) {
      throw new Error(`Channel '${channelId}' does not exist`)
    }

    if (this.validator && !this.validator.canSubscribe(player, channelId)) {
      return false
    }

    return channel.subscribe(player, metadata)
  }

  /**
   * Unsubscribes a player from a channel.
   *
   * @param channelId - Channel identifier
   * @param player - Player to unsubscribe
   * @returns true if unsubscribed successfully, false if channel doesn't exist or player wasn't subscribed
   */
  unsubscribe(channelId: string, player: Player): boolean {
    const channel = this.channels.get(channelId)
    if (!channel) {
      return false
    }

    return channel.unsubscribe(player)
  }

  /**
   * Checks if a player is subscribed to a channel.
   *
   * @param channelId - Channel identifier
   * @param player - Player to check
   * @returns true if player is subscribed, false otherwise
   */
  isSubscribed(channelId: string, player: Player): boolean {
    const channel = this.channels.get(channelId)
    if (!channel) {
      return false
    }

    return channel.isSubscribed(player)
  }

  /**
   * Broadcasts a message to all subscribers of a channel.
   *
   * @remarks
   * If a validator is set, it will check if the sender can broadcast.
   * Only sends to currently subscribed players.
   *
   * @param channelId - Channel identifier
   * @param sender - Player sending the message
   * @param message - Message content
   * @param author - Display name for the sender (defaults to sender.name)
   * @param color - Message color (defaults to white)
   * @throws Error if channel doesn't exist
   *
   * @example
   * ```typescript
   * channels.broadcast(
   *   'group:police',
   *   player,
   *   'Suspect heading north',
   *   undefined,
   *   { r: 0, g: 100, b: 255 }
   * )
   * ```
   */
  broadcast(
    channelId: string,
    sender: Player,
    message: string,
    author?: string,
    color: RGB = { r: 255, g: 255, b: 255 },
  ): void {
    const channel = this.channels.get(channelId)
    if (!channel) {
      throw new Error(`Channel '${channelId}' does not exist`)
    }

    if (this.validator && !this.validator.canBroadcast(sender, channelId)) {
      return
    }

    const subscribers = channel.getSubscribers()
    const targetIds = subscribers.map((p) => p.clientID)

    if (targetIds.length === 0) {
      return
    }

    this.netTransport.emitNet('core:chat:addMessage', targetIds, {
      args: [author ?? sender.name, message],
      color: color,
    })
  }

  /**
   * Broadcasts a system message to all subscribers of a channel.
   *
   * @remarks
   * System messages bypass validator checks and don't require a sender.
   *
   * @param channelId - Channel identifier
   * @param message - Message content
   * @param author - Display name (defaults to 'SYSTEM')
   * @param color - Message color (defaults to light blue)
   * @throws Error if channel doesn't exist
   *
   * @example
   * ```typescript
   * channels.broadcastSystem(
   *   'group:police',
   *   'group meeting in 5 minutes',
   *   'DISPATCH'
   * )
   * ```
   */
  broadcastSystem(
    channelId: string,
    message: string,
    author: string = 'SYSTEM',
    color: RGB = { r: 0, g: 191, b: 255 },
  ): void {
    const channel = this.channels.get(channelId)
    if (!channel) {
      throw new Error(`Channel '${channelId}' does not exist`)
    }

    const subscribers = channel.getSubscribers()
    const targetIds = subscribers.map((p) => p.clientID)

    if (targetIds.length === 0) {
      return
    }

    this.netTransport.emitNet('core:chat:addMessage', targetIds, {
      args: [author, message],
      color: color,
    })
  }

  /**
   * Gets all players subscribed to a channel.
   *
   * @param channelId - Channel identifier
   * @returns Array of subscribed players (empty if channel doesn't exist)
   */
  getSubscribers(channelId: string): Player[] {
    const channel = this.channels.get(channelId)
    if (!channel) {
      return []
    }

    return channel.getSubscribers()
  }

  /**
   * Gets all channels of a specific type.
   *
   * @param type - Channel type to filter by
   * @returns Array of channels matching the type
   *
   * @example
   * ```typescript
   * const groupChannels = channels.getChannelsByType(ChannelType.group)
   * ```
   */
  getChannelsByType(type: ChannelType): Channel[] {
    return Array.from(this.channels.values()).filter((channel) => channel.type === type)
  }

  /**
   * Gets all channels a player is subscribed to.
   *
   * @param player - Player to check
   * @returns Array of channels the player is subscribed to
   *
   * @example
   * ```typescript
   * const playerChannels = channels.getChannelsByPlayer(player)
   * playerChannels.forEach(ch => {
   *   console.log(`Player is in channel: ${ch.id}`)
   * })
   * ```
   */
  getChannelsByPlayer(player: Player): Channel[] {
    return Array.from(this.channels.values()).filter((channel) => channel.isSubscribed(player))
  }

  /**
   * Gets all existing channels.
   *
   * @returns Array of all channels
   */
  getAllChannels(): Channel[] {
    return Array.from(this.channels.values())
  }

  /**
   * Clears all channels and their subscribers.
   *
   * @remarks
   * Persistent channels are cleared but not deleted.
   * Only available in CORE/STANDALONE mode.
   */
  clear(): void {
    for (const channel of this.channels.values()) {
      if (!channel.isPersistent) {
        channel.clear()
      }
    }
    this.channels.clear()
  }

  /**
   * Deletes all non-persistent (temporary) channels.
   *
   * @remarks
   * Useful for cleanup operations. Persistent channels are not affected.
   * Only available in CORE/STANDALONE mode.
   */
  clearNonPersistent(): void {
    for (const [id, channel] of this.channels.entries()) {
      if (!channel.isPersistent) {
        channel.clear()
        this.channels.delete(id)
      }
    }
  }

  /**
   * Creates a temporary proximity-based channel around a player.
   *
   * @remarks
   * Automatically subscribes all players within the specified radius.
   * Channel is non-persistent and should be deleted after use.
   * Calculates 3D distance between players.
   *
   * @param originPlayer - Player at the center of the proximity area
   * @param radius - Distance radius in game units
   * @param channelId - Optional custom channel ID (auto-generated if not provided)
   * @returns The created channel with nearby players subscribed, or undefined if origin player has no position
   *
   * @example
   * ```typescript
   * // Create proximity channel for local chat
   * const nearby = channels.createProximityChannel(player, 50.0)
   * if (nearby) {
   *   channels.broadcast(nearby.id, player, 'Hello nearby players!')
   *   channels.delete(nearby.id) // Clean up
   * }
   * ```
   */
  createProximityChannel(
    originPlayer: Player,
    radius: number,
    channelId?: string,
  ): Channel | undefined {
    const id = channelId ?? `proximity:${originPlayer.clientID}:${Date.now()}`
    const originPos = originPlayer.getPosition()

    if (!originPos) {
      return undefined
    }

    const channel = this.create(
      id,
      {
        type: ChannelType.PROXIMITY,
        maxRange: radius,
        persistent: false,
      },
      undefined,
    )

    const allPlayers = this.playerDirectory.getAll()
    const nearbyPlayers = allPlayers.filter((p) => {
      const pos = p.getPosition()
      if (!pos) return false

      const dx = originPos.x - pos.x
      const dy = originPos.y - pos.y
      const dz = originPos.z - pos.z
      const distance = Math.sqrt(dx * dx + dy * dy + dz * dz)

      return distance <= radius
    })

    for (const player of nearbyPlayers) {
      channel.subscribe(player)
    }

    return channel
  }
}
