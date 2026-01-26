import { Player } from './player'
import { ChannelMetadata, ChannelSubscription, ChannelType } from '../types/channel.types'

export class Channel {
  private subscribers: Map<number, ChannelSubscription> = new Map()

  constructor(
    public readonly id: string,
    public readonly metadata: ChannelMetadata,
    private readonly maxSubscribers?: number,
  ) {}

  subscribe(player: Player, subscriptionMetadata?: Record<string, unknown>): boolean {
    if (this.maxSubscribers && this.subscribers.size >= this.maxSubscribers) {
      return false
    }

    if (this.subscribers.has(player.clientID)) {
      return false
    }

    this.subscribers.set(player.clientID, {
      player,
      subscribedAt: Date.now(),
      metadata: subscriptionMetadata,
    })

    return true
  }

  unsubscribe(player: Player): boolean {
    return this.subscribers.delete(player.clientID)
  }

  isSubscribed(player: Player): boolean {
    return this.subscribers.has(player.clientID)
  }

  getSubscribers(): Player[] {
    return Array.from(this.subscribers.values()).map((sub) => sub.player)
  }

  getSubscriberCount(): number {
    return this.subscribers.size
  }

  getSubscription(player: Player): ChannelSubscription | undefined {
    return this.subscribers.get(player.clientID)
  }

  clear(): void {
    this.subscribers.clear()
  }

  get type(): ChannelType {
    return this.metadata.type
  }

  get isPersistent(): boolean {
    return this.metadata.persistent ?? false
  }

  toJSON() {
    return {
      id: this.id,
      metadata: this.metadata,
      subscriberCount: this.subscribers.size,
      subscribers: Array.from(this.subscribers.values()).map((sub) => ({
        clientID: sub.player.clientID,
        name: sub.player.name,
        subscribedAt: sub.subscribedAt,
      })),
    }
  }
}
