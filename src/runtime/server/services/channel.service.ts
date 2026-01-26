import { inject, injectable } from 'tsyringe'
import { INetTransport } from '../../../adapters/contracts/INetTransport'
import { RGB } from '../../../kernel/utils/rgb'
import { Channel } from '../entities/channel'
import { Player } from '../entities/player'
import { ChannelMetadata, ChannelType, IChannelValidator } from '../types/channel.types'
import { Players } from '../ports/player-directory'

@injectable()
export class ChannelService {
  private channels: Map<string, Channel> = new Map()
  private validator?: IChannelValidator

  constructor(
    private readonly playerDirectory: Players,
    @inject(INetTransport as any) private readonly netTransport: INetTransport,
  ) {}

  setValidator(validator: IChannelValidator): void {
    this.validator = validator
  }

  create(id: string, metadata: ChannelMetadata, maxSubscribers?: number): Channel {
    if (this.channels.has(id)) {
      throw new Error(`Channel with id '${id}' already exists`)
    }

    const channel = new Channel(id, metadata, maxSubscribers)
    this.channels.set(id, channel)

    return channel
  }

  createPrivate(players: Player[], metadata: ChannelMetadata): Channel {
    const id = `private:${Date.now()}:${Math.random().toString(36).substring(7)}`
    const channel = this.create(id, { ...metadata, persistent: false }, players.length)

    for (const player of players) {
      channel.subscribe(player)
    }

    return channel
  }

  get(id: string): Channel | undefined {
    return this.channels.get(id)
  }

  getOrCreate(id: string, metadata: ChannelMetadata, maxSubscribers?: number): Channel {
    const existing = this.channels.get(id)
    if (existing) {
      return existing
    }

    return this.create(id, metadata, maxSubscribers)
  }

  delete(id: string): boolean {
    const channel = this.channels.get(id)
    if (!channel) {
      return false
    }

    channel.clear()
    return this.channels.delete(id)
  }

  exists(id: string): boolean {
    return this.channels.has(id)
  }

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

  unsubscribe(channelId: string, player: Player): boolean {
    const channel = this.channels.get(channelId)
    if (!channel) {
      return false
    }

    return channel.unsubscribe(player)
  }

  isSubscribed(channelId: string, player: Player): boolean {
    const channel = this.channels.get(channelId)
    if (!channel) {
      return false
    }

    return channel.isSubscribed(player)
  }

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

  getSubscribers(channelId: string): Player[] {
    const channel = this.channels.get(channelId)
    if (!channel) {
      return []
    }

    return channel.getSubscribers()
  }

  getChannelsByType(type: ChannelType): Channel[] {
    return Array.from(this.channels.values()).filter((channel) => channel.type === type)
  }

  getChannelsByPlayer(player: Player): Channel[] {
    return Array.from(this.channels.values()).filter((channel) => channel.isSubscribed(player))
  }

  getAllChannels(): Channel[] {
    return Array.from(this.channels.values())
  }

  clear(): void {
    for (const channel of this.channels.values()) {
      if (!channel.isPersistent) {
        channel.clear()
      }
    }
    this.channels.clear()
  }

  clearNonPersistent(): void {
    for (const [id, channel] of this.channels.entries()) {
      if (!channel.isPersistent) {
        channel.clear()
        this.channels.delete(id)
      }
    }
  }

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

  createRadioChannel(frequency: number, maxRange?: number): Channel {
    const id = `radio:${frequency}`
    return this.getOrCreate(id, {
      type: ChannelType.RADIO,
      frequency,
      maxRange,
      persistent: true,
    })
  }

  createPhoneChannel(callerId: string, receiverId: string): Channel {
    const id = `phone:${callerId}:${receiverId}`
    return this.create(
      id,
      {
        type: ChannelType.PHONE,
        persistent: false,
      },
      2,
    )
  }

  createTeamChannel(teamId: string): Channel {
    const id = `team:${teamId}`
    return this.getOrCreate(id, {
      type: ChannelType.TEAM,
      persistent: true,
    })
  }

  createAdminChannel(): Channel {
    const id = 'admin'
    return this.getOrCreate(id, {
      type: ChannelType.ADMIN,
      persistent: true,
    })
  }

  createGlobalChannel(): Channel {
    const id = 'global'
    return this.getOrCreate(id, {
      type: ChannelType.GLOBAL,
      persistent: true,
    })
  }
}
