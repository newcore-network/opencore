import { inject, injectable } from 'tsyringe'
import { IExports, IPlayerInfo } from '../../../../adapters'
import { IEntityServer } from '../../../../adapters/contracts/IEntityServer'
import { INetTransport } from '../../../../adapters/contracts/INetTransport'
import { IPlayerServer } from '../../../../adapters/contracts/IPlayerServer'
import { loggers } from '../../../../kernel/shared/logger'
import { Player, type PlayerAdapters } from '../../entities'
import { getRuntimeContext } from '../../runtime'
import type { CorePlayerExports, SerializedPlayerData } from '../../types/core-exports'
import { PlayerDirectoryPort } from '../ports/player-directory.port'

/**
 * Player service implementation for `RESOURCE` mode.
 *
 * @remarks
 * This service delegates all player operations to CORE via exports.
 * It creates local Player instances hydrated with real session data from CORE,
 * ensuring RESOURCE mode has access to accurate player information.
 */
@injectable()
export class RemotePlayerService extends PlayerDirectoryPort {
  /**
   * Cached adapters bundle for Player instances
   */
  private readonly playerAdapters: PlayerAdapters

  constructor(
    @inject(IPlayerInfo as any) private readonly playerInfo: IPlayerInfo,
    @inject(IExports as any) private readonly exportsService: IExports,
    @inject(IPlayerServer as any) private readonly playerServer: IPlayerServer,
    @inject(IEntityServer as any) private readonly entityServer: IEntityServer,
    @inject(INetTransport as any) private readonly netTransport: INetTransport,
  ) {
    super()
    this.playerAdapters = {
      playerInfo: this.playerInfo,
      playerServer: this.playerServer,
      entityServer: this.entityServer,
      netTransport: this.netTransport,
    }
  }

  /**
   * Gets typed access to CORE resource exports.
   */
  private get core(): CorePlayerExports {
    const { coreResourceName } = getRuntimeContext()
    const coreExports = this.exportsService.getResource<CorePlayerExports>(coreResourceName)

    if (!coreExports) {
      throw new Error(
        `[OpenCore] CORE resource '${coreResourceName}' exports not found. ` +
          `Ensure the CORE resource is started BEFORE RESOURCE mode resources.`,
      )
    }

    return coreExports
  }

  /**
   * Creates a local Player instance from serialized data.
   *
   * @remarks
   * The returned Player is hydrated with session data from CORE,
   * including accountID, identifiers, metadata, and states.
   */
  private createPlayerFromData(data: SerializedPlayerData): Player {
    const player = new Player(
      {
        clientID: data.clientID,
        accountID: data.accountID,
        identifiers: data.identifiers,
        meta: data.meta,
      },
      this.playerAdapters,
    )

    // Restore state flags
    for (const state of data.states) {
      player.addState(state)
    }

    return player
  }

  /**
   * Returns a Player instance with real session data from CORE.
   */
  getByClient(clientID: number): Player | undefined {
    try {
      const data = this.core.getPlayerData(clientID)
      if (!data) return undefined
      return this.createPlayerFromData(data)
    } catch (error) {
      loggers.session.warn(`Failed to get player data from CORE`, {
        clientID,
        error: error instanceof Error ? error.message : String(error),
      })
      // Fallback to basic player
      return new Player({ clientID, meta: {} }, this.playerAdapters)
    }
  }

  getMany(clientIds: number[]): Player[] {
    try {
      const many = this.core.getManyData(clientIds)

      return many.map((data) => this.createPlayerFromData(data))
    } catch (error) {
      if (error instanceof Error) loggers.exports.error(error.message, undefined, error)
      else loggers.exports.error('unknown error', undefined)
      return []
    }
  }

  /**
   * Returns all connected players with real session data from CORE.
   */
  getAll(): Player[] {
    try {
      const allData = this.core.getAllPlayersData()
      return allData.map((data) => this.createPlayerFromData(data))
    } catch (error) {
      loggers.session.warn(`Failed to get all players from CORE, using fallback`, {
        error: error instanceof Error ? error.message : String(error),
      })
      // In RESOURCE mode fallback, return empty - we can't enumerate without CORE
      return []
    }
  }

  getPlayerId(clientID: number): string | undefined {
    return this.core.getPlayerId(clientID)
  }

  async getMeta<T = unknown>(clientID: number, key: string): Promise<T | undefined> {
    return this.core.getPlayerMeta(clientID, key)
  }

  setMeta(clientID: number, key: string, value: unknown): void {
    this.core.setPlayerMeta(clientID, key, value)
  }

  // ═══════════════════════════════════════════════════════════════
  // Extended methods (delegated to CORE)
  // ═══════════════════════════════════════════════════════════════

  /**
   * Finds a player by their persistent account ID.
   */
  getByAccountId(accountId: string): Player | undefined {
    try {
      const data = this.core.getPlayerByAccountId(accountId)
      if (!data) return undefined
      return this.createPlayerFromData(data)
    } catch {
      return undefined
    }
  }

  /**
   * Gets the current player count from CORE.
   */
  getPlayerCount(): number {
    try {
      return this.core.getPlayerCount()
    } catch {
      // In RESOURCE mode, we can't enumerate without CORE
      return 0
    }
  }

  /**
   * Checks if a player with given account ID is online.
   */
  isOnline(accountId: string): boolean {
    try {
      return this.core.isPlayerOnline(accountId)
    } catch {
      return false
    }
  }
}
