import { Player } from '../../entities'

/**
 * Core port that provides access to active player sessions.
 *
 * @remarks
 * This port defines a framework-owned boundary for querying and managing player-related data
 * regardless of the current runtime mode (CORE, RESOURCE, etc.).
 *
 * Implementations of this port are responsible for resolving player information
 * from the authoritative source (local session store, remote core exports, etc.).
 *
 * Consumers should treat returned {@link Player} instances as runtime representations
 * of connected clients, not as persistent domain models.
 *
 * **Mode Differences:**
 * - **CORE/STANDALONE**: Data is local and authoritative
 * - **RESOURCE**: Data is fetched from CORE via exports
 */
export abstract class PlayerDirectoryPort {
  /**
   * Returns the {@link Player} associated with a given FiveM client ID.
   *
   * @param clientID - The FiveM server client ID (`source`).
   * @returns The corresponding {@link Player} instance, or `undefined` if the player is not connected.
   */
  abstract getByClient(clientID: number): Player | undefined

  /**
   * Returns a group of {@link Player} associated with a given fivem clients ids
   *
   * @param clientIds The fivem server client ID (`source`)
   */
  abstract getMany(clientIds: number[]): Player[]

  /**
   * Returns all currently connected players.
   *
   * @returns An array of {@link Player} instances representing all active clients.
   */
  abstract getAll(): Player[]

  /**
   * Returns the persistent account identifier associated with a client.
   *
   * @remarks
   * The returned identifier is typically assigned after authentication and may be
   * `undefined` if the player has not completed the login or character selection flow.
   *
   * @param clientID - The FiveM server client ID (`source`).
   * @returns The linked account ID, or `undefined` if none is associated.
   */
  abstract getPlayerId(clientID: number): string | undefined

  /**
   * Retrieves a metadata value associated with a player session.
   *
   * @remarks
   * Metadata values are transient and scoped to the current session.
   * Implementations may resolve this data locally or delegate to the core runtime.
   *
   * @typeParam T - The expected type of the stored value.
   * @param clientID - The FiveM server client ID (`source`).
   * @param key - The metadata key to retrieve.
   * @returns The stored value, or `undefined` if the key does not exist.
   */
  abstract getMeta<T = unknown>(clientID: number, key: string): Promise<T | undefined>

  /**
   * Stores a metadata value in the player session.
   *
   * @remarks
   * Metadata is intended for transient runtime state such as flags, gameplay context,
   * or temporary attributes. It is not persisted across reconnects.
   *
   * @param clientID - The FiveM server client ID (`source`).
   * @param key - The metadata key to store.
   * @param value - The value to associate with the given key.
   */
  abstract setMeta(clientID: number, key: string, value: unknown): void

  // ═══════════════════════════════════════════════════════════════
  // Extended Query Methods (optional implementation)
  // ═══════════════════════════════════════════════════════════════

  /**
   * Returns the {@link Player} associated with a persistent account ID.
   *
   * @remarks
   * Searches all connected players for one with the matching accountID.
   * Returns `undefined` if no player with that account is currently online.
   *
   * @param accountId - The persistent account identifier.
   * @returns The corresponding {@link Player} instance, or `undefined` if not online.
   */
  getByAccountId?(accountId: string): Player | undefined

  /**
   * Returns the current number of connected players.
   *
   * @remarks
   * More efficient than `getAll().length` for implementations that
   * can provide a count without fetching all player data.
   *
   * @returns The number of currently connected players.
   */
  getPlayerCount?(): number

  /**
   * Checks if a player with the given account ID is currently online.
   *
   * @remarks
   * More efficient than `getByAccountId() !== undefined` for implementations
   * that can check presence without fetching full player data.
   *
   * @param accountId - The persistent account identifier.
   * @returns `true` if the player is online, `false` otherwise.
   */
  isOnline?(accountId: string): boolean
}
