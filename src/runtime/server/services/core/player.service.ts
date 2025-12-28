import { inject, injectable } from 'tsyringe'
import { Player } from '../../entities'
import { PlayerDirectoryPort } from '../ports/player-directory.port'
import { IPlayerInfo } from '../../../../adapters'
import { PlayerSessionLifecyclePort } from '../ports/player-session-lifecycle.port'
import { LinkedID } from '../types/linked-id'
import { PlayerSession } from '../types/player-session.object'
import { loggers } from '../../../../kernel/shared/logger'

/**
 * Service responsible for managing the lifecycle of player sessions.
 * It acts as the central registry for all connected players, mapping FiveM client IDs
 * to Core `Player` entities.
 *
 * @remarks
 * This service is used as a singleton in the dependency container.
 * It exposes the operations defined by {@link PlayerDirectoryPort} and {@link PlayerSessionLifecyclePort}.
 */
@injectable()
export class PlayerService implements PlayerDirectoryPort, PlayerSessionLifecyclePort {
  /**
   * Internal map storing active player sessions indexed by their FiveM client ID (source).
   */
  private playersByClient = new Map<number, Player>()

  constructor(@inject(IPlayerInfo as any) private readonly playerInfo: IPlayerInfo) {}

  /**
   * Initializes a new player session for a connecting client.
   *
   * This method is typically called during the `playerJoining` event or
   * immediately after a successful handshake/login flow.
   *
   * @param clientID - The FiveM server ID (source) of the player.
   * @param identifiers - Optional object containing platform identifiers (license, steam, etc.).
   * @returns The newly created `Player` instance.
   */
  bind(clientID: number, identifiers?: PlayerSession['identifiers']): Player {
    const session: PlayerSession = {
      clientID,
      identifiers,
      meta: {},
    }

    const player = new Player(session, this.playerInfo)
    this.playersByClient.set(clientID, player)
    loggers.session.debug('Player session bound', {
      clientID,
      totalPlayers: this.playersByClient.size,
    })
    return player
  }

  /**
   * Associates an authenticated Account ID (database ID) with an active player session.
   *
   * Call this method once the player has successfully authenticated (e.g., after character selection
   * or login) to link their session to their persistent data.
   *
   * @param clientID - The FiveM server ID of the player.
   * @param accountID - The unique identifier from your database/persistence layer.
   */
  linkAccount(clientID: number, accountID: LinkedID) {
    const player = this.playersByClient.get(clientID)
    if (!player) return
    player.linkAccount(accountID)
  }

  /**
   * Terminates a player session and removes them from the registry.
   *
   * This should be called when the `playerDropped` event is triggered to ensure
   * memory is freed and the session is closed.
   *
   * @param clientID - The FiveM server ID of the player disconnecting.
   */
  unbind(clientID: number) {
    this.playersByClient.delete(clientID)
    loggers.session.debug('Player session unbound', {
      clientID,
      totalPlayers: this.playersByClient.size,
    })
  }

  /**
   * Retrieves the `Player` entity associated with a specific FiveM client ID.
   *
   * @param clientID - The FiveM server ID to look up.
   * @returns The `Player` instance if found, or `null` if the session does not exist.
   */
  getByClient(clientID: number): Player | undefined {
    return this.playersByClient.get(clientID)
  }

  /**
   * Helper to retrieve the authenticated Account ID for a given client.
   *
   * @param clientID - The FiveM server ID to look up.
   * @returns The bound Account ID (string/UUID) if the player is logged in, or `null` otherwise.
   */
  getPlayerId(clientID: number): string | undefined {
    const player = this.playersByClient.get(clientID)
    return player?.accountID
  }

  /**
   * Stores arbitrary metadata in the player's session.
   * Useful for storing transient state like 'isDead', 'job', 'dimension', etc.
   *
   * @param clientID - The FiveM server ID of the player.
   * @param key - The unique key for the metadata entry.
   * @param value - The value to store.
   */
  setMeta(clientID: number, key: string, value: unknown) {
    const player = this.playersByClient.get(clientID)
    if (!player) return

    player.setMeta(key, value)
  }

  /**
   * Retrieves metadata previously stored in the player's session.
   *
   * @template T - The expected type of the returned value.
   * @param clientID - The FiveM server ID of the player.
   * @param key - The metadata key to retrieve.
   * @returns The value cast to type `T`, or `undefined` if the key or player doesn't exist.
   */
  async getMeta<T = unknown>(clientID: number, key: string): Promise<T | undefined> {
    const player = this.playersByClient.get(clientID)
    return await player?.getMeta<T>(key)
  }

  /**
   * Returns a list of all currently active `Player` entities.
   *
   * @returns An array containing all connected players managed by this service.
   */
  getAll(): Player[] {
    return Array.from(this.playersByClient.values())
  }

  // ═══════════════════════════════════════════════════════════════
  // Extended Query Methods
  // ═══════════════════════════════════════════════════════════════

  /**
   * Retrieves a Player by their persistent account ID.
   *
   * @param accountId - The unique account identifier to search for.
   * @returns The Player if found, or `undefined` if not online.
   */
  getByAccountId(accountId: string): Player | undefined {
    for (const player of this.playersByClient.values()) {
      if (player.accountID === accountId) {
        return player
      }
    }
    return undefined
  }

  /**
   * Returns the current number of connected players.
   *
   * @returns Player count.
   */
  getPlayerCount(): number {
    return this.playersByClient.size
  }

  /**
   * Checks if a player with the given account ID is currently online.
   *
   * @param accountId - The account identifier to check.
   * @returns `true` if online, `false` otherwise.
   */
  isOnline(accountId: string): boolean {
    for (const player of this.playersByClient.values()) {
      if (player.accountID === accountId) {
        return true
      }
    }
    return false
  }
}
