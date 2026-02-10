import 'reflect-metadata'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { EventsAPI } from '../../../../src/adapters/contracts/transport/events.api'
import { Player } from '../../../../src/runtime/server/entities/player'
import { Players } from '../../../../src/runtime/server/ports/players.api-port'
import { ChannelType } from '../../../../src/runtime/server/types/channel.types'
import { Channels } from '../../../../src/runtime/server/ports/channel.api-port'
import { LocalChannelImplementation } from '../../../../src/runtime/server/implementations/local/channel.local'

describe('ChannelService', () => {
  let channelService: Channels
  let mockPlayerDirectory: Players
  let mockEventsAPI: EventsAPI<'server'>
  let mockPlayer1: Player
  let mockPlayer2: Player
  let mockPlayer3: Player

  beforeEach(() => {
    mockPlayer1 = {
      clientID: 1,
      name: 'Player1',
      getPosition: vi.fn().mockReturnValue({ x: 0, y: 0, z: 0 }),
    } as any

    mockPlayer2 = {
      clientID: 2,
      name: 'Player2',
      getPosition: vi.fn().mockReturnValue({ x: 10, y: 10, z: 0 }),
    } as any

    mockPlayer3 = {
      clientID: 3,
      name: 'Player3',
      getPosition: vi.fn().mockReturnValue({ x: 100, y: 100, z: 0 }),
    } as any

    mockPlayerDirectory = {
      getAll: vi.fn().mockReturnValue([mockPlayer1, mockPlayer2, mockPlayer3]),
      getByClient: vi.fn(),
      getMany: vi.fn(),
      getPlayerId: vi.fn(),
      getMeta: vi.fn(),
      setMeta: vi.fn(),
    } as any

    mockEventsAPI = {
      emit: vi.fn(),
      on: vi.fn(),
    } as any

    channelService = new LocalChannelImplementation(mockPlayerDirectory, mockEventsAPI)

    channelService.create(`radio:100`, { type: ChannelType.RADIO })
    channelService.create(`radio:101`, { type: ChannelType.RADIO })
    channelService.create(`team:alpha`, { type: ChannelType.GROUP })
    channelService.create(`team:omega`, { type: ChannelType.GROUP })
  })

  describe('Channel Creation', () => {
    it('should create a new channel', () => {
      const channel = channelService.create('test-channel', {
        type: ChannelType.CUSTOM,
      })

      expect(channel).toBeDefined()
      expect(channel.id).toBe('test-channel')
      expect(channel.type).toBe(ChannelType.CUSTOM)
    })

    it('should throw error when creating duplicate channel', () => {
      channelService.create('test-channel', { type: ChannelType.CUSTOM })

      expect(() => {
        channelService.create('test-channel', { type: ChannelType.CUSTOM })
      }).toThrow("Channel with id 'test-channel' already exists")
    })

    it('should create private channel with players', () => {
      const channel = channelService.createPrivate([mockPlayer1, mockPlayer2], {
        type: ChannelType.PHONE,
      })

      expect(channel).toBeDefined()
      expect(channel.getSubscriberCount()).toBe(2)
      expect(channel.isSubscribed(mockPlayer1)).toBe(true)
      expect(channel.isSubscribed(mockPlayer2)).toBe(true)
    })
  })

  describe('Channel Management', () => {
    it('should get existing channel', () => {
      const created = channelService.create('test', { type: ChannelType.CUSTOM })
      const retrieved = channelService.get('test')

      expect(retrieved).toBe(created)
    })

    it('should return undefined for non-existent channel', () => {
      const retrieved = channelService.get('non-existent')

      expect(retrieved).toBeUndefined()
    })

    it('should check if channel exists', () => {
      channelService.create('test', { type: ChannelType.CUSTOM })

      expect(channelService.exists('test')).toBe(true)
      expect(channelService.exists('non-existent')).toBe(false)
    })

    it('should delete channel', () => {
      channelService.create('test', { type: ChannelType.CUSTOM })
      const deleted = channelService.delete('test')

      expect(deleted).toBe(true)
      expect(channelService.exists('test')).toBe(false)
    })

    it('should return false when deleting non-existent channel', () => {
      const deleted = channelService.delete('non-existent')

      expect(deleted).toBe(false)
    })
  })

  describe('Subscription Management', () => {
    beforeEach(() => {
      channelService.create('test-channel', { type: ChannelType.CUSTOM })
    })

    it('should subscribe player to channel', () => {
      const result = channelService.subscribe('test-channel', mockPlayer1)

      expect(result).toBe(true)
      expect(channelService.isSubscribed('test-channel', mockPlayer1)).toBe(true)
    })

    it('should not subscribe same player twice', () => {
      channelService.subscribe('test-channel', mockPlayer1)
      const result = channelService.subscribe('test-channel', mockPlayer1)

      expect(result).toBe(false)
    })

    it('should unsubscribe player from channel', () => {
      channelService.subscribe('test-channel', mockPlayer1)
      const result = channelService.unsubscribe('test-channel', mockPlayer1)

      expect(result).toBe(true)
      expect(channelService.isSubscribed('test-channel', mockPlayer1)).toBe(false)
    })

    it('should throw error when subscribing to non-existent channel', () => {
      expect(() => {
        channelService.subscribe('non-existent', mockPlayer1)
      }).toThrow("Channel 'non-existent' does not exist")
    })

    it('should get subscribers of channel', () => {
      channelService.subscribe('test-channel', mockPlayer1)
      channelService.subscribe('test-channel', mockPlayer2)

      const subscribers = channelService.getSubscribers('test-channel')

      expect(subscribers).toHaveLength(2)
      expect(subscribers).toContain(mockPlayer1)
      expect(subscribers).toContain(mockPlayer2)
    })

    it('should return empty array for non-existent channel subscribers', () => {
      const subscribers = channelService.getSubscribers('non-existent')

      expect(subscribers).toEqual([])
    })
  })

  describe('Broadcasting', () => {
    beforeEach(() => {
      channelService.create('test-channel', { type: ChannelType.CUSTOM })
      channelService.subscribe('test-channel', mockPlayer1)
      channelService.subscribe('test-channel', mockPlayer2)
    })

    it('should broadcast message to channel subscribers', () => {
      channelService.broadcast('test-channel', mockPlayer1, 'Hello everyone!')

      expect(mockEventsAPI.emit).toHaveBeenCalledWith('core:chat:addMessage', [1, 2], {
        args: ['Player1', 'Hello everyone!'],
        color: { r: 255, g: 255, b: 255 },
      })
    })

    it('should broadcast with custom author and color', () => {
      channelService.broadcast('test-channel', mockPlayer1, 'Test message', 'CustomAuthor', {
        r: 100,
        g: 150,
        b: 200,
      })

      expect(mockEventsAPI.emit).toHaveBeenCalledWith('core:chat:addMessage', [1, 2], {
        args: ['CustomAuthor', 'Test message'],
        color: { r: 100, g: 150, b: 200 },
      })
    })

    it('should broadcast system message', () => {
      channelService.broadcastSystem('test-channel', 'System announcement')

      expect(mockEventsAPI.emit).toHaveBeenCalledWith('core:chat:addMessage', [1, 2], {
        args: ['SYSTEM', 'System announcement'],
        color: { r: 0, g: 191, b: 255 },
      })
    })

    it('should not broadcast to empty channel', () => {
      channelService.create('empty-channel', { type: ChannelType.CUSTOM })
      channelService.broadcast('empty-channel', mockPlayer1, 'Test')

      expect(mockEventsAPI.emit).not.toHaveBeenCalled()
    })

    it('should throw error when broadcasting to non-existent channel', () => {
      expect(() => {
        channelService.broadcast('non-existent', mockPlayer1, 'Test')
      }).toThrow("Channel 'non-existent' does not exist")
    })
  })

  describe('Proximity Channels', () => {
    it('should create proximity channel with nearby players', () => {
      const channel = channelService.createProximityChannel(mockPlayer1, 20)

      expect(channel).toBeDefined()
      expect(channel?.type).toBe(ChannelType.PROXIMITY)
      expect(channel?.getSubscriberCount()).toBe(2)
      expect(channel?.isSubscribed(mockPlayer1)).toBe(true)
      expect(channel?.isSubscribed(mockPlayer2)).toBe(true)
      expect(channel?.isSubscribed(mockPlayer3)).toBe(false)
    })

    it('should return undefined if player has no position', () => {
      mockPlayer1.getPosition = vi.fn().mockReturnValue(null)

      const channel = channelService.createProximityChannel(mockPlayer1, 20)

      expect(channel).toBeUndefined()
    })

    it('should filter players without position', () => {
      mockPlayer2.getPosition = vi.fn().mockReturnValue(null)

      const channel = channelService.createProximityChannel(mockPlayer1, 20)

      expect(channel?.getSubscriberCount()).toBe(1)
      expect(channel?.isSubscribed(mockPlayer1)).toBe(true)
      expect(channel?.isSubscribed(mockPlayer2)).toBe(false)
    })
  })

  describe('Query Methods', () => {
    it('should get channels by type', () => {
      const radioChannels = channelService.getChannelsByType(ChannelType.RADIO)

      expect(radioChannels).toHaveLength(2)
      expect(radioChannels.every((ch) => ch.type === ChannelType.RADIO)).toBe(true)
      expect(radioChannels.every((ch) => ch.id.startsWith('radio:'))).toBe(true)
    })

    it('should get channels by player', () => {
      channelService.subscribe('radio:100', mockPlayer1)
      channelService.subscribe('team:alpha', mockPlayer1)

      const playerChannels = channelService.getChannelsByPlayer(mockPlayer1)

      expect(playerChannels).toHaveLength(2)
      expect(playerChannels.every((ch) => ch.isSubscribed(mockPlayer1))).toBe(true)
    })

    it('should get all channels', () => {
      const allChannels = channelService.getAllChannels()

      expect(allChannels.length).toBeGreaterThanOrEqual(4)
    })
  })

  describe('Cleanup', () => {
    it('should clear all channels', () => {
      channelService.clear()

      expect(channelService.getAllChannels()).toHaveLength(0)
    })

    it('should clear only non-persistent channels', () => {
      channelService.createPrivate([mockPlayer1], { type: ChannelType.PHONE })

      channelService.clearNonPersistent()

      const remaining = channelService.getAllChannels()
      expect(remaining.every((ch) => ch.isPersistent)).toBe(true)
    })
  })

  describe('Validator Integration', () => {
    it('should use validator for subscription', () => {
      const validator = {
        canSubscribe: vi.fn().mockReturnValue(false),
        canBroadcast: vi.fn().mockReturnValue(true),
        canCreate: vi.fn().mockReturnValue(true),
      }

      channelService.setValidator(validator)
      channelService.create('test', { type: ChannelType.CUSTOM })

      const result = channelService.subscribe('test', mockPlayer1)

      expect(result).toBe(false)
      expect(validator.canSubscribe).toHaveBeenCalledWith(mockPlayer1, 'test')
    })

    it('should use validator for broadcast', () => {
      const validator = {
        canSubscribe: vi.fn().mockReturnValue(true),
        canBroadcast: vi.fn().mockReturnValue(false),
        canCreate: vi.fn().mockReturnValue(true),
      }

      channelService.setValidator(validator)
      channelService.create('test', { type: ChannelType.CUSTOM })
      channelService.subscribe('test', mockPlayer1)

      channelService.broadcast('test', mockPlayer1, 'Test')

      expect(validator.canBroadcast).toHaveBeenCalledWith(mockPlayer1, 'test')
      expect(mockEventsAPI.emit).not.toHaveBeenCalled()
    })
  })
})
