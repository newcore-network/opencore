import type { Player } from '../../entities'

/**
 * Core port that provides read-only access to active player sessions.
 *
 * @remarks
 * This port defines a framework-owned boundary for querying player-related data
 * regardless of the current runtime mode (CORE, RESOURCE, etc.).
 *
 * Implementations of this port are responsible for resolving player information
 * from the authoritative source (local session store, remote core exports, etc.).
 *
 * Consumers should treat returned {@link Player} instances as runtime representations
 * of connected clients, not as persistent domain models.
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
}
