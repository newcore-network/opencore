import 'reflect-metadata'
import { beforeEach, describe, expect, it } from 'vitest'
import { Channel } from '../../../../src/runtime/server/entities/channel'
import { Player } from '../../../../src/runtime/server/entities/player'
import { ChannelType } from '../../../../src/runtime/server/types/channel.types'

describe('Channel Entity', () => {
  let channel: Channel
  let mockPlayer1: Player
  let mockPlayer2: Player

  beforeEach(() => {
    channel = new Channel(
      'test-channel',
      {
        type: ChannelType.CUSTOM,
        persistent: false,
      },
      10,
    )

    mockPlayer1 = {
      clientID: 1,
      name: 'Player1',
    } as any

    mockPlayer2 = {
      clientID: 2,
      name: 'Player2',
    } as any
  })

  describe('Subscription', () => {
    it('should subscribe a player', () => {
      const result = channel.subscribe(mockPlayer1)

      expect(result).toBe(true)
      expect(channel.isSubscribed(mockPlayer1)).toBe(true)
      expect(channel.getSubscriberCount()).toBe(1)
    })

    it('should not subscribe same player twice', () => {
      channel.subscribe(mockPlayer1)
      const result = channel.subscribe(mockPlayer1)

      expect(result).toBe(false)
      expect(channel.getSubscriberCount()).toBe(1)
    })

    it('should respect max subscribers limit', () => {
      const limitedChannel = new Channel('limited', { type: ChannelType.CUSTOM }, 1)

      limitedChannel.subscribe(mockPlayer1)
      const result = limitedChannel.subscribe(mockPlayer2)

      expect(result).toBe(false)
      expect(limitedChannel.getSubscriberCount()).toBe(1)
    })

    it('should store subscription metadata', () => {
      const metadata = { role: 'admin', joinedFrom: 'invite' }
      channel.subscribe(mockPlayer1, metadata)

      const subscription = channel.getSubscription(mockPlayer1)

      expect(subscription).toBeDefined()
      expect(subscription?.metadata).toEqual(metadata)
      expect(subscription?.player).toBe(mockPlayer1)
    })

    it('should record subscription timestamp', () => {
      const beforeTime = Date.now()
      channel.subscribe(mockPlayer1)
      const afterTime = Date.now()

      const subscription = channel.getSubscription(mockPlayer1)

      expect(subscription?.subscribedAt).toBeGreaterThanOrEqual(beforeTime)
      expect(subscription?.subscribedAt).toBeLessThanOrEqual(afterTime)
    })
  })

  describe('Unsubscription', () => {
    it('should unsubscribe a player', () => {
      channel.subscribe(mockPlayer1)
      const result = channel.unsubscribe(mockPlayer1)

      expect(result).toBe(true)
      expect(channel.isSubscribed(mockPlayer1)).toBe(false)
      expect(channel.getSubscriberCount()).toBe(0)
    })

    it('should return false when unsubscribing non-subscribed player', () => {
      const result = channel.unsubscribe(mockPlayer1)

      expect(result).toBe(false)
    })
  })

  describe('Queries', () => {
    beforeEach(() => {
      channel.subscribe(mockPlayer1)
      channel.subscribe(mockPlayer2)
    })

    it('should get all subscribers', () => {
      const subscribers = channel.getSubscribers()

      expect(subscribers).toHaveLength(2)
      expect(subscribers).toContain(mockPlayer1)
      expect(subscribers).toContain(mockPlayer2)
    })

    it('should get subscriber count', () => {
      expect(channel.getSubscriberCount()).toBe(2)
    })

    it('should check if player is subscribed', () => {
      expect(channel.isSubscribed(mockPlayer1)).toBe(true)
      expect(channel.isSubscribed(mockPlayer2)).toBe(true)

      const mockPlayer3 = { clientID: 3, name: 'Player3' } as any
      expect(channel.isSubscribed(mockPlayer3)).toBe(false)
    })

    it('should get subscription details', () => {
      const subscription = channel.getSubscription(mockPlayer1)

      expect(subscription).toBeDefined()
      expect(subscription?.player).toBe(mockPlayer1)
    })

    it('should return undefined for non-subscribed player', () => {
      const mockPlayer3 = { clientID: 3, name: 'Player3' } as any
      const subscription = channel.getSubscription(mockPlayer3)

      expect(subscription).toBeUndefined()
    })
  })

  describe('Properties', () => {
    it('should expose channel id', () => {
      expect(channel.id).toBe('test-channel')
    })

    it('should expose channel type', () => {
      expect(channel.type).toBe(ChannelType.CUSTOM)
    })

    it('should expose persistent flag', () => {
      expect(channel.isPersistent).toBe(false)

      const persistentChannel = new Channel('persistent', {
        type: ChannelType.RADIO,
        persistent: true,
      })
      expect(persistentChannel.isPersistent).toBe(true)
    })

    it('should default persistent to false', () => {
      const defaultChannel = new Channel('default', { type: ChannelType.CUSTOM })
      expect(defaultChannel.isPersistent).toBe(false)
    })
  })

  describe('Clear', () => {
    it('should remove all subscribers', () => {
      channel.subscribe(mockPlayer1)
      channel.subscribe(mockPlayer2)

      channel.clear()

      expect(channel.getSubscriberCount()).toBe(0)
      expect(channel.isSubscribed(mockPlayer1)).toBe(false)
      expect(channel.isSubscribed(mockPlayer2)).toBe(false)
    })
  })

  describe('Serialization', () => {
    it('should serialize to JSON', () => {
      channel.subscribe(mockPlayer1)
      channel.subscribe(mockPlayer2)

      const json = channel.toJSON()

      expect(json).toMatchObject({
        id: 'test-channel',
        metadata: {
          type: ChannelType.CUSTOM,
          persistent: false,
        },
        subscriberCount: 2,
      })
      expect(json.subscribers).toHaveLength(2)
      expect(json.subscribers[0]).toHaveProperty('clientID')
      expect(json.subscribers[0]).toHaveProperty('name')
      expect(json.subscribers[0]).toHaveProperty('subscribedAt')
    })
  })
})
