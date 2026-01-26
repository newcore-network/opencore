import { inject, injectable } from 'tsyringe'
import { IExports } from '../../../../adapters/contracts/IExports'
import { loggers } from '../../../../kernel/logger'
import { RGB } from '../../../../kernel/utils/rgb'
import { Channels } from '../../apis/channel.api'
import { Channel } from '../../entities/channel'
import { Player } from '../../entities/player'
import { getRuntimeContext } from '../../runtime'
import { ChannelMetadata, ChannelType, IChannelValidator } from '../../types/channel.types'
import { Players } from '../../ports/player-directory'

/**
 * Channel exports interface from CORE.
 */
interface CoreChannelExports {
  createChannel(
    channelId: string,
    metadata: ChannelMetadata,
    maxSubscribers?: number,
    resourceName?: string,
  ): boolean
  getOrCreateChannel(
    channelId: string,
    metadata: ChannelMetadata,
    maxSubscribers?: number,
    resourceName?: string,
  ): boolean
  deleteChannel(channelId: string): boolean
  channelExists(channelId: string): boolean
  subscribeToChannel(
    channelId: string,
    clientID: number,
    metadata?: Record<string, unknown>,
  ): boolean
  unsubscribeFromChannel(channelId: string, clientID: number): boolean
  isSubscribedToChannel(channelId: string, clientID: number): boolean
  getChannelSubscriberCount(channelId: string): number
  getChannelSubscribers(channelId: string): number[]
  broadcastToChannel(
    channelId: string,
    senderClientID: number,
    message: string,
    author?: string,
    color?: RGB,
  ): boolean
  broadcastSystemToChannel(
    channelId: string,
    message: string,
    author?: string,
    color?: RGB,
  ): boolean
  createProximityChannel(originClientID: number, radius: number, channelId?: string): string | null
  createPrivateChannel(clientIDs: number[], metadata: ChannelMetadata): string | null
  getChannelsByType(type: ChannelType): string[]
  getPlayerChannels(clientID: number): string[]
  getAllChannels(): string[]
}

/**
 * Remote channel implementation for RESOURCE mode.
 *
 * @remarks
 * In RESOURCE mode, this service delegates all channel operations to CORE via exports.
 * Channels are centrally managed in CORE, allowing cross-resource communication.
 *
 * Flow:
 * 1. Resource calls channel method → delegates to CORE export
 * 2. CORE manages channel state centrally
 * 3. All resources share the same channel registry
 */
@injectable()
export class RemoteChannelImplementation extends Channels {
  private resourceName: string

  constructor(
    @inject(IExports as any) private exportsService: IExports,
    playerDirectory: Players,
  ) {
    super(playerDirectory, null as any)
    this.resourceName = GetCurrentResourceName()
  }

  /**
   * Gets typed access to CORE resource exports.
   */
  private get core(): CoreChannelExports {
    const { coreResourceName } = getRuntimeContext()
    const coreExports = this.exportsService.getResource<CoreChannelExports>(coreResourceName)

    if (!coreExports) {
      throw new Error(
        `[OpenCore] CORE resource '${coreResourceName}' exports not found. ` +
          `Ensure the CORE resource is started BEFORE RESOURCE mode resources. ` +
          `Add 'ensure ${coreResourceName}' before this resource in server.cfg`,
      )
    }

    return coreExports
  }

  // ═══════════════════════════════════════════════════════════════
  // Channel Creation & Management (delegated to CORE)
  // ═══════════════════════════════════════════════════════════════

  create(id: string, metadata: ChannelMetadata, maxSubscribers?: number): Channel {
    const success = this.core.createChannel(id, metadata, maxSubscribers, this.resourceName)
    if (!success) {
      throw new Error(`Failed to create channel '${id}' in CORE`)
    }
    loggers.api.debug(`Channel '${id}' created in CORE from resource '${this.resourceName}'`)
    return new Channel(id, metadata, maxSubscribers)
  }

  getOrCreate(id: string, metadata: ChannelMetadata, maxSubscribers?: number): Channel {
    this.core.getOrCreateChannel(id, metadata, maxSubscribers, this.resourceName)
    return new Channel(id, metadata, maxSubscribers)
  }

  delete(id: string): boolean {
    return this.core.deleteChannel(id)
  }

  exists(id: string): boolean {
    return this.core.channelExists(id)
  }

  get(id: string): Channel | undefined {
    if (this.core.channelExists(id)) {
      return new Channel(id, { type: ChannelType.GLOBAL, persistent: true })
    }
    return undefined
  }

  // ═══════════════════════════════════════════════════════════════
  // Subscription Management (delegated to CORE)
  // ═══════════════════════════════════════════════════════════════

  subscribe(channelId: string, player: Player, metadata?: Record<string, unknown>): boolean {
    return this.core.subscribeToChannel(channelId, player.clientID, metadata)
  }

  unsubscribe(channelId: string, player: Player): boolean {
    return this.core.unsubscribeFromChannel(channelId, player.clientID)
  }

  isSubscribed(channelId: string, player: Player): boolean {
    return this.core.isSubscribedToChannel(channelId, player.clientID)
  }

  getSubscribers(channelId: string): Player[] {
    const clientIDs = this.core.getChannelSubscribers(channelId)
    return clientIDs
      .map((id) => this['playerDirectory'].getByClient(id))
      .filter((p) => p !== undefined)
  }

  // ═══════════════════════════════════════════════════════════════
  // Broadcasting (delegated to CORE)
  // ═══════════════════════════════════════════════════════════════

  broadcast(
    channelId: string,
    sender: Player,
    message: string,
    author?: string,
    color?: RGB,
  ): void {
    const success = this.core.broadcastToChannel(channelId, sender.clientID, message, author, color)
    if (!success) {
      loggers.api.warn(`Failed to broadcast to channel '${channelId}'`)
    }
  }

  broadcastSystem(channelId: string, message: string, author?: string, color?: RGB): void {
    const success = this.core.broadcastSystemToChannel(channelId, message, author, color)
    if (!success) {
      loggers.api.warn(`Failed to broadcast system message to channel '${channelId}'`)
    }
  }

  // ═══════════════════════════════════════════════════════════════
  // Specialized Channel Creation (delegated to CORE)
  // ═══════════════════════════════════════════════════════════════

  createProximityChannel(
    originPlayer: Player,
    radius: number,
    channelId?: string,
  ): Channel | undefined {
    const id = this.core.createProximityChannel(originPlayer.clientID, radius, channelId)
    if (!id) return undefined

    return new Channel(
      id,
      {
        type: ChannelType.PROXIMITY,
        maxRange: radius,
        persistent: false,
      },
      undefined,
    )
  }

  createPrivate(players: Player[], metadata: ChannelMetadata): Channel {
    const clientIDs = players.map((p) => p.clientID)
    const id = this.core.createPrivateChannel(clientIDs, metadata)

    if (!id) {
      throw new Error('Failed to create private channel in CORE')
    }

    return new Channel(id, { ...metadata, persistent: false }, players.length)
  }

  // ═══════════════════════════════════════════════════════════════
  // Query & Introspection (delegated to CORE)
  // ═══════════════════════════════════════════════════════════════

  getChannelsByType(type: ChannelType): Channel[] {
    const channelIds = this.core.getChannelsByType(type)
    return channelIds.map((id) => new Channel(id, { type, persistent: true }))
  }

  getChannelsByPlayer(player: Player): Channel[] {
    const channelIds = this.core.getPlayerChannels(player.clientID)
    return channelIds.map((id) => new Channel(id, { type: ChannelType.GLOBAL, persistent: true }))
  }

  getAllChannels(): Channel[] {
    const channelIds = this.core.getAllChannels()
    return channelIds.map((id) => new Channel(id, { type: ChannelType.GLOBAL, persistent: true }))
  }

  // ═══════════════════════════════════════════════════════════════
  // Utility Methods
  // ═══════════════════════════════════════════════════════════════

  setValidator(_validator: IChannelValidator): void {
    loggers.api.warn(
      'Channel validators are not supported in RESOURCE mode. Validators must be set in CORE.',
    )
  }

  clear(): void {
    loggers.api.warn('clear() is not supported in RESOURCE mode. Channels are managed by CORE.')
  }

  clearNonPersistent(): void {
    loggers.api.warn(
      'clearNonPersistent() is not supported in RESOURCE mode. Channels are managed by CORE.',
    )
  }
}
