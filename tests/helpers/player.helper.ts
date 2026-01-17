import type { Vector3 } from '@open-core/framework'
import type { NetTarget } from '../../src/adapters/contracts/INetTransport'
import { INetTransport } from '../../src/adapters/contracts/INetTransport'
import { IPlayerInfo } from '../../src/adapters/contracts/IPlayerInfo'
import {
  type EntityStateBag,
  IEntityServer,
  type SetPositionOptions,
} from '../../src/adapters/contracts/server/IEntityServer'
import { IPlayerServer } from '../../src/adapters/contracts/server/IPlayerServer'
import type { PlayerIdentifier } from '../../src/adapters/contracts/types/identifier'
import { Player, type PlayerAdapters } from '../../src/runtime/server/entities/player'
import type { PlayerSession } from '../../src/runtime/server/services/types/player-session.object'

/**
 * Mock implementation of IPlayerInfo for testing.
 */
export class MockPlayerInfo extends IPlayerInfo {
  getPlayerName(clientId: number): string | null {
    return `TestPlayer${clientId}`
  }

  getPlayerPosition(_clientId: number): Vector3 {
    return { x: 0, y: 0, z: 0 }
  }
}

/**
 * Mock implementation of IPlayerServer for testing.
 */
export class MockPlayerServer extends IPlayerServer {
  private connectedPlayers: string[] = []
  private playerIdentifiers: Map<string, Record<string, string>> = new Map()
  private routingBuckets: Map<string, number> = new Map()

  getPed(_playerSrc: string): number {
    return 1
  }

  drop(_playerSrc: string, _reason: string): void {}

  getIdentifier(playerSrc: string, identifierType: string): string | undefined {
    const identifiers = this.playerIdentifiers.get(playerSrc)
    return identifiers?.[identifierType]
  }

  getIdentifiers(playerSrc: string): string[] {
    const identifiers = this.playerIdentifiers.get(playerSrc)
    if (!identifiers) return []
    return Object.entries(identifiers).map(([type, value]) => `${type}:${value}`)
  }

  getPlayerIdentifiers(playerSrc: string): PlayerIdentifier[] {
    const identifiers = this.playerIdentifiers.get(playerSrc)
    if (!identifiers) return []

    return Object.entries(identifiers).map(([type, value]) => ({
      type,
      value,
      raw: `${type}:${value}`,
    }))
  }

  getNumIdentifiers(playerSrc: string): number {
    return this.getIdentifiers(playerSrc).length
  }

  getName(playerSrc: string): string {
    return `TestPlayer${playerSrc}`
  }

  getPing(_playerSrc: string): number {
    return 50
  }

  getEndpoint(_playerSrc: string): string {
    return '127.0.0.1:30120'
  }

  setRoutingBucket(_playerSrc: string, _bucket: number): void {}

  getRoutingBucket(playerSrc: string): number {
    return this.routingBuckets.get(playerSrc) ?? 0
  }

  getConnectedPlayers(): string[] {
    return [...this.connectedPlayers]
  }

  // Test helpers
  _setConnectedPlayers(players: string[]): void {
    this.connectedPlayers = players
  }

  _setPlayerIdentifiers(playerSrc: string, identifiers: Record<string, string>): void {
    this.playerIdentifiers.set(playerSrc, identifiers)
  }

  _setRoutingBucket(playerSrc: string, bucket: number): void {
    this.routingBuckets.set(playerSrc, bucket)
  }

  _reset(): void {
    this.connectedPlayers = []
    this.playerIdentifiers.clear()
    this.routingBuckets.clear()
  }
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

  setCoords(
    _handle: number,
    _x: number,
    _y: number,
    _z: number,
    _alive?: boolean,
    _deadFlag?: boolean,
    _ragdollFlag?: boolean,
    _clearArea?: boolean,
  ): void {}

  setPosition(_handle: number, _position: Vector3, _options?: SetPositionOptions): void {}

  getHeading(_handle: number): number {
    return 0
  }

  setHeading(_handle: number, _heading: number): void {}

  getModel(_handle: number): number {
    return 0
  }

  delete(_handle: number): void {}

  setOrphanMode(_handle: number, _mode: number): void {}

  setRoutingBucket(_handle: number, _bucket: number): void {}

  getRoutingBucket(_handle: number): number {
    return 0
  }

  getStateBag(_handle: number): EntityStateBag {
    const state = new Map<string, unknown>()
    return {
      set: (key: string, value: unknown, _replicated?: boolean) => state.set(key, value),
      get: (key: string) => state.get(key),
    }
  }

  getHealth(_handle: number): number {
    return 100
  }

  setHealth(_handle: number, _health: number): void {}

  getArmor(_handle: number): number {
    return 0
  }

  setArmor(_handle: number, _armor: number): void {}
}

/**
 * Mock implementation of INetTransport for testing.
 */
export class MockNetTransport extends INetTransport {
  onNet(
    _eventName: string,
    _handler: (ctx: { clientId: number }, ...args: any[]) => void | Promise<void>,
  ): void {}

  emitNet(_eventName: string, _target: NetTarget, ..._args: any[]): void {}
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
