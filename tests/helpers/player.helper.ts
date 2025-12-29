import { Player } from '../../src/runtime/server/entities/player'
import { IPlayerInfo } from '../../src/adapters/contracts/IPlayerInfo'
import type { PlayerSession } from '../../src/runtime/server/services/types/player-session.object'
import type { Vector3 } from '../../src/kernel/utils'

/**
 * Mock implementation of IPlayerInfo for testing.
 */
export class MockPlayerInfo extends IPlayerInfo {
  getPlayerName(clientId: number): string | null {
    return `TestPlayer${clientId}`
  }

  getPlayerPosition(clientId: number): Vector3 | undefined {
    return { x: 0, y: 0, z: 0 }
  }
}

/**
 * Shared mock instance for tests.
 */
export const mockPlayerInfo = new MockPlayerInfo()

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

  return new Player(session, mockPlayerInfo)
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
