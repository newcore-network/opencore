import { type EntityStateBag, IEntityServer } from '../../src/adapters/contracts/IEntityServer'
import { INetTransport } from '../../src/adapters/contracts/INetTransport'
import { IPlayerInfo } from '../../src/adapters/contracts/IPlayerInfo'
import { IPlayerServer } from '../../src/adapters/contracts/IPlayerServer'
import type { Vector3 } from '../../src/kernel/utils'
import { Player, type PlayerAdapters } from '../../src/runtime/server/entities/player'
import type { PlayerSession } from '../../src/runtime/server/services/types/player-session.object'

/**
 * Mock implementation of IPlayerInfo for testing.
 */
export class MockPlayerInfo extends IPlayerInfo {
  getPlayerName(clientId: number): string | null {
    return `TestPlayer${clientId}`
  }

  getPlayerPosition(_clientId: number): Vector3 | undefined {
    return { x: 0, y: 0, z: 0 }
  }
}

/**
 * Mock implementation of IPlayerServer for testing.
 */
export class MockPlayerServer extends IPlayerServer {
  getPed(_playerSrc: string): number {
    return 1
  }

  drop(_playerSrc: string, _reason: string): void {}

  getIdentifier(_playerSrc: string, _identifierType: string): string | undefined {
    return undefined
  }

  getIdentifiers(_playerSrc: string): string[] {
    return []
  }

  getNumIdentifiers(_playerSrc: string): number {
    return 0
  }

  getName(_playerSrc: string): string {
    return 'TestPlayer'
  }

  getPing(_playerSrc: string): number {
    return 50
  }

  getEndpoint(_playerSrc: string): string {
    return '127.0.0.1:30120'
  }

  setRoutingBucket(_playerSrc: string, _bucket: number): void {}
}

/**
 * Mock implementation of IEntityServer for testing.
 */
export class MockEntityServer extends IEntityServer {
  doesExist(_handle: number): boolean {
    return true
  }

  getCoords(_handle: number): Vector3 {
    return { x: 0, y: 0, z: 0 }
  }

  setCoords(): void {}

  getHeading(_handle: number): number {
    return 0
  }

  setHeading(): void {}

  getModel(_handle: number): number {
    return 0
  }

  delete(_handle: number): void {}

  setOrphanMode(): void {}

  setRoutingBucket(): void {}

  getRoutingBucket(_handle: number): number {
    return 0
  }

  getStateBag(_handle: number): EntityStateBag {
    const state = new Map<string, unknown>()
    return {
      set: (key: string, value: unknown) => state.set(key, value),
      get: (key: string) => state.get(key),
    }
  }
}

/**
 * Mock implementation of INetTransport for testing.
 */
export class MockNetTransport extends INetTransport {
  onNet(_eventName: string, _handler: (...args: any[]) => void): void {}

  emitNet(_eventName: string, _target: number | string, ..._args: any[]): void {}

  on(_eventName: string, _handler: (...args: any[]) => void): void {}

  emit(_eventName: string, ..._args: any[]): void {}
}

/**
 * Shared mock instances for tests.
 */
export const mockPlayerInfo = new MockPlayerInfo()
export const mockPlayerServer = new MockPlayerServer()
export const mockEntityServer = new MockEntityServer()
export const mockNetTransport = new MockNetTransport()

/**
 * Creates a mock PlayerAdapters bundle for testing.
 */
export function createMockPlayerAdapters(): PlayerAdapters {
  return {
    playerInfo: mockPlayerInfo,
    playerServer: mockPlayerServer,
    entityServer: mockEntityServer,
    netTransport: mockNetTransport,
  }
}

/**
 * Creates a test Player instance with mocked dependencies.
 *
 * @param options - Optional overrides for the player session
 * @returns A fully functional Player instance for testing
 *
 * @example
 * ```ts
 * const player = createTestPlayer()
 * const playerWithId = createTestPlayer({ clientID: 42 })
 * const authenticatedPlayer = createTestPlayer({ clientID: 1, accountID: 'acc-123' })
 * ```
 */
export function createTestPlayer(options: Partial<PlayerSession> = {}): Player {
  const session: PlayerSession = {
    clientID: options.clientID ?? Math.floor(Math.random() * 1000) + 1,
    accountID: options.accountID,
    identifiers: options.identifiers,
    meta: options.meta ?? {},
  }

  return new Player(session, createMockPlayerAdapters())
}

/**
 * Creates a test Player that is authenticated (has accountID).
 */
export function createAuthenticatedPlayer(
  accountID: string = 'test-account-123',
  options: Partial<PlayerSession> = {},
): Player {
  return createTestPlayer({
    ...options,
    accountID,
  })
}
