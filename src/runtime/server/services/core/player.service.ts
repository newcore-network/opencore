import { inject, injectable } from 'tsyringe'
import type { UUIDTypes } from 'uuid'
import { Player } from '../../entities'
import { PlayerDirectoryContract } from '../contracts/player.service.contract'
import { IPlayerInfo } from '../../../../adapters'
import { PlayerSessionLifecycleContract } from '../contracts/player-session-lifecycle.contract'

/**
 * Type representing a linked account identifier. This come from your persistence layer
 * and is used to associate a Player session with their stored data.
 */
export type LinkedID = string | UUIDTypes | number

export interface PlayerSession {
  clientID: number
  accountID?: LinkedID
  identifiers?: {
    license?: string
    steam?: string
    discord?: string
  }
  meta: Record<string, unknown>
}

/**
 * Service responsible for managing the lifecycle of player sessions.
 * It acts as the central registry for all connected players, mapping FiveM client IDs
 * to Core `Player` entities.
 */
@injectable()
export class PlayerService implements PlayerDirectoryContract, PlayerSessionLifecycleContract {
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
    console.log('[DEBUG][PlayerService instance]', this)
    const session: PlayerSession = {
      clientID,
      identifiers,
      meta: {},
    }
    console.log('DEBUG;' + clientID + ' and type of' + typeof clientID)

    const player = new Player(session, this.playerInfo)
    this.playersByClient.set(clientID, player)
    console.log(
      'DEBUG; map entries after bind:',
      Array.from(this.playersByClient.entries()).map(([id, player]) => ({
        clientID: id,
        player: player,
      })),
    )
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
    console.log(`DEBUG; UNBINED PLAYER ${clientID}`)
    this.playersByClient.delete(clientID)
  }

  /**
   * Retrieves the `Player` entity associated with a specific FiveM client ID.
   *
   * @param clientID - The FiveM server ID to look up.
   * @returns The `Player` instance if found, or `null` if the session does not exist.
   */
  getByClient(clientID: number): Player | null {
    const player = this.playersByClient.get(clientID)
    if (!player) {
      console.log('[DEBUG][PlayerService instance]', this)
      console.log(`DEBUG; not found ???, was not id(${clientID})`)
      console.log(
        'DEBUG; map entries:',
        Array.from(this.playersByClient.entries()).map(([id, player]) => ({
          clientID: id,
          player: player,
        })),
      )
      console.log('DEBUG; end')
      return null
    }
    return player
  }

  /**
   * Helper to retrieve the authenticated Account ID for a given client.
   *
   * @param clientID - The FiveM server ID to look up.
   * @returns The bound Account ID (string/UUID) if the player is logged in, or `null` otherwise.
   */
  getPlayerId(clientID: number): string | null {
    const player = this.playersByClient.get(clientID)
    return player?.accountID ?? null
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
}
