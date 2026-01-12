import 'reflect-metadata'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { IPlayerServer } from '../../../../src/adapters/contracts/server/IPlayerServer'
import { Player } from '../../../../src/runtime/server/entities/player'
import { SessionRecoveryService } from '../../../../src/runtime/server/services/core/session-recovery.service'
import { PlayerDirectoryPort } from '../../../../src/runtime/server/services/ports/player-directory.port'
import { PlayerSessionLifecyclePort } from '../../../../src/runtime/server/services/ports/player-session-lifecycle.port'
import { createMockPlayerAdapters, MockPlayerServer } from '../../../helpers/player.helper'

describe('SessionRecoveryService', () => {
  let recoveryService: SessionRecoveryService
  let mockPlayerServer: MockPlayerServer
  let mockPlayerDirectory: PlayerDirectoryPort
  let mockPlayerSessionLifecycle: PlayerSessionLifecyclePort
  let boundPlayers: Map<number, Player>

  beforeEach(() => {
    // Reset state
    boundPlayers = new Map()
    mockPlayerServer = new MockPlayerServer()

    // Mock PlayerDirectory
    mockPlayerDirectory = {
      getByClient: vi.fn((clientId: number) => boundPlayers.get(clientId)),
      getMany: vi.fn(() => []),
      getPlayerId: vi.fn(),
      setMeta: vi.fn(),
      getMeta: vi.fn(),
      getAll: vi.fn(() => Array.from(boundPlayers.values())),
      getByAccountId: vi.fn(),
      getPlayerCount: vi.fn(() => boundPlayers.size),
      isOnline: vi.fn(),
    } as unknown as PlayerDirectoryPort

    // Mock PlayerSessionLifecycle
    mockPlayerSessionLifecycle = {
      bind: vi.fn((clientId: number, identifiers?: any) => {
        const player = new Player(
          { clientID: clientId, identifiers, meta: {} },
          createMockPlayerAdapters(),
        )
        boundPlayers.set(clientId, player)
        return player
      }),
      unbind: vi.fn((clientId: number) => {
        boundPlayers.delete(clientId)
      }),
    } as unknown as PlayerSessionLifecyclePort

    recoveryService = new SessionRecoveryService(
      mockPlayerServer as unknown as IPlayerServer,
      mockPlayerDirectory,
      mockPlayerSessionLifecycle,
    )
  })

  describe('recoverSessions', () => {
    it('should return empty stats when no players are connected', () => {
      mockPlayerServer._setConnectedPlayers([])

      const stats = recoveryService.recoverSessions()

      expect(stats).toEqual({ total: 0, recovered: 0, existing: 0 })
      expect(mockPlayerSessionLifecycle.bind).not.toHaveBeenCalled()
    })

    it('should recover sessions for connected players without existing sessions', () => {
      mockPlayerServer._setConnectedPlayers(['1', '2', '3'])
      mockPlayerServer._setPlayerIdentifiers('1', { license: 'license:abc123' })
      mockPlayerServer._setPlayerIdentifiers('2', { license: 'license:def456', steam: 'steam:789' })
      mockPlayerServer._setPlayerIdentifiers('3', { discord: 'discord:123' })

      const stats = recoveryService.recoverSessions()

      expect(stats).toEqual({ total: 3, recovered: 3, existing: 0 })
      expect(mockPlayerSessionLifecycle.bind).toHaveBeenCalledTimes(3)
      expect(mockPlayerSessionLifecycle.bind).toHaveBeenCalledWith(1, {
        license: 'license:abc123',
        steam: undefined,
        discord: undefined,
      })
      expect(mockPlayerSessionLifecycle.bind).toHaveBeenCalledWith(2, {
        license: 'license:def456',
        steam: 'steam:789',
        discord: undefined,
      })
    })

    it('should skip players that already have sessions', () => {
      // Pre-create a session for player 1
      const existingPlayer = new Player(
        { clientID: 1, identifiers: { license: 'license:existing' }, meta: {} },
        createMockPlayerAdapters(),
      )
      boundPlayers.set(1, existingPlayer)

      mockPlayerServer._setConnectedPlayers(['1', '2'])
      mockPlayerServer._setPlayerIdentifiers('2', { license: 'license:new' })

      const stats = recoveryService.recoverSessions()

      expect(stats).toEqual({ total: 2, recovered: 1, existing: 1 })
      expect(mockPlayerSessionLifecycle.bind).toHaveBeenCalledTimes(1)
      expect(mockPlayerSessionLifecycle.bind).toHaveBeenCalledWith(2, {
        license: 'license:new',
        steam: undefined,
        discord: undefined,
      })
    })

    it('should skip invalid client IDs', () => {
      mockPlayerServer._setConnectedPlayers(['0', '-1', 'invalid', '5'])
      mockPlayerServer._setPlayerIdentifiers('5', { license: 'license:valid' })

      const stats = recoveryService.recoverSessions()

      expect(stats).toEqual({ total: 4, recovered: 1, existing: 0 })
      expect(mockPlayerSessionLifecycle.bind).toHaveBeenCalledTimes(1)
      expect(mockPlayerSessionLifecycle.bind).toHaveBeenCalledWith(5, expect.any(Object))
    })

    it('should handle mixed scenarios with existing and new sessions', () => {
      // Pre-create sessions for players 1 and 3
      boundPlayers.set(1, new Player({ clientID: 1, meta: {} }, createMockPlayerAdapters()))
      boundPlayers.set(3, new Player({ clientID: 3, meta: {} }, createMockPlayerAdapters()))

      mockPlayerServer._setConnectedPlayers(['1', '2', '3', '4', '5'])
      mockPlayerServer._setPlayerIdentifiers('2', { license: 'license:p2' })
      mockPlayerServer._setPlayerIdentifiers('4', { license: 'license:p4' })
      mockPlayerServer._setPlayerIdentifiers('5', { license: 'license:p5' })

      const stats = recoveryService.recoverSessions()

      expect(stats).toEqual({ total: 5, recovered: 3, existing: 2 })
      expect(mockPlayerSessionLifecycle.bind).toHaveBeenCalledTimes(3)
    })

    it('should handle players with no identifiers', () => {
      mockPlayerServer._setConnectedPlayers(['1'])
      // No identifiers set for player 1

      const stats = recoveryService.recoverSessions()

      expect(stats).toEqual({ total: 1, recovered: 1, existing: 0 })
      expect(mockPlayerSessionLifecycle.bind).toHaveBeenCalledWith(1, {
        license: undefined,
        steam: undefined,
        discord: undefined,
      })
    })
  })
})
