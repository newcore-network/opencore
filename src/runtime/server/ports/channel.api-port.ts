import { RGB } from 'src/kernel'
import { Channel, Player } from '../entities'
import { ChannelMetadata, ChannelType, IChannelValidator } from '../types'

export abstract class Channels {
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
  abstract setValidator(validator: IChannelValidator): void

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
  abstract create(id: string, metadata: ChannelMetadata, maxSubscribers?: number): Channel

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
  abstract createPrivate(players: Player[], metadata: ChannelMetadata): Channel

  abstract get(id: string): Channel | undefined
  abstract delete(id: string): boolean
  abstract exists(id: string): boolean

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
  abstract subscribe(channelId: string, player: Player, metadata?: Record<string, unknown>): boolean

  /**
   * Unsubscribes a player from a channel.
   *
   * @param channelId - Channel identifier
   * @param player - Player to unsubscribe
   * @returns true if unsubscribed successfully, false if channel doesn't exist or player wasn't subscribed
   */
  abstract unsubscribe(channelId: string, player: Player): boolean

  abstract isSubscribed(channelId: string, player: Player): boolean

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
  abstract broadcast(
    channelId: string,
    sender: Player,
    message: string,
    author?: string,
    color?: RGB,
  ): void

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
  abstract broadcastSystem(channelId: string, message: string, author?: string, color?: RGB): void
  abstract getSubscribers(channelId: string): Player[]

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
  abstract getChannelsByType(type: ChannelType): Channel[]

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
  abstract getChannelsByPlayer(player: Player): Channel[]
  abstract getAllChannels(): Channel[]

  /**
   * Clears all channels and their subscribers.
   *
   * @remarks
   * Persistent channels are cleared but not deleted.
   * Only available in CORE/STANDALONE mode.
   */
  abstract clear(): void

  /**
   * Deletes all non-persistent (temporary) channels.
   *
   * @remarks
   * Useful for cleanup operations. Persistent channels are not affected.
   * Only available in CORE/STANDALONE mode.
   */
  abstract clearNonPersistent(): void

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
  abstract createProximityChannel(
    originPlayer: Player,
    radius: number,
    channelId?: string,
  ): Channel | undefined
}
