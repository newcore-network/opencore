import { BaseEntity } from '@open-core/framework'
import { WorldContext } from '@open-core/framework'
import { inject, injectable } from 'tsyringe'
import { IPlayerInfo } from '../../../../adapters'
import { INetTransport } from '../../../../adapters/contracts/INetTransport'
import { IEntityServer } from '../../../../adapters/contracts/server/IEntityServer'
import { IPlayerServer } from '../../../../adapters/contracts/server/IPlayerServer'
import { loggers } from '../../../../kernel/logger'
import { Player, type PlayerAdapters } from '../../entities'
import { PlayerDirectoryPort } from '../ports/player-directory.port'
import { PlayerSessionLifecyclePort } from '../ports/player-session-lifecycle.port'
import { PlayerSession } from '../types/player-session.object'

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
  private readonly playerAdapters: PlayerAdapters

  constructor(
    private readonly world: WorldContext,

    @inject(IPlayerInfo as any) private readonly playerInfo: IPlayerInfo,
    @inject(IPlayerServer as any) private readonly playerServer: IPlayerServer,
    @inject(IEntityServer as any) private readonly entityServer: IEntityServer,
    @inject(INetTransport as any) private readonly netTransport: INetTransport,
  ) {
    this.playerAdapters = {
      playerInfo: this.playerInfo,
      playerServer: this.playerServer,
      entityServer: this.entityServer,
      netTransport: this.netTransport,
    }
  }

  private isPlayer(e: BaseEntity): e is Player {
    return e.id.startsWith('player:')
  }

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

    const player = new Player(session, this.playerAdapters)
    this.world.add(player)
    loggers.session.debug('Player session bound', {
      clientID,
      totalPlayers: this.world.sizeBy('player'),
    })
    return player
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
    const player = this.getByClient(clientID)
    if (player) this.world.remove(player.id)

    loggers.session.debug('Player session unbound', {
      clientID,
      totalPlayers: this.world.sizeBy('player'),
    })
  }

  /**
   * Retrieves the `Player` entity associated with a specific FiveM client ID.
   *
   * @param clientID - The FiveM server ID to look up.
   * @returns The `Player` instance if found, or `null` if the session does not exist.
   */
  getByClient(clientID: number): Player | undefined {
    return this.world.get<Player>(`player:${clientID}`)
  }

  getMany(clientIds: number[]): Player[] {
    const result: Player[] = []
    for (const id of clientIds) {
      const p = this.getByClient(id)
      if (p) result.push(p)
    }
    return result
  }

  /**
   * Returns a list of all currently active `Player` entities.
   *
   * @returns An array containing all connected players managed by this service.
   */
  getAll(): Player[] {
    return this.world.find(this.isPlayer)
  }

  /**
   * Helper to retrieve the authenticated Account ID for a given client.
   *
   * @param clientID - The FiveM server ID to look up.
   * @returns The bound Account ID (string/UUID) if the player is logged in, or `null` otherwise.
   */
  getPlayerId(clientID: number): string | undefined {
    return this.getByClient(clientID)?.accountID
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
    const player = this.getByClient(clientID)
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
    return this.getByClient(clientID)?.getMeta<T>(key)
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
    return this.world.find(this.isPlayer).find((p) => p.accountID === accountId)
  }

  /**
   * Returns the current number of connected players.
   *
   * @returns Player count.
   */
  getPlayerCount(): number {
    return this.world.sizeBy('player')
  }

  /**
   * Checks if a player with the given account ID is currently online.
   *
   * @param accountId - The account identifier to check.
   * @returns `true` if online, `false` otherwise.
   */
  isOnline(accountId: string): boolean {
    return !!this.getByAccountId(accountId)
  }
}
