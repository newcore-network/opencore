import { inject, injectable } from 'tsyringe'
import { Player } from '../../entities'
import { getRuntimeContext } from '../../runtime'
import { PlayerDirectoryPort } from '../ports/player-directory.port'
import { IPlayerInfo, IExports } from '../../../../adapters'
import type { CorePlayerExports, SerializedPlayerData } from '../../types/core-exports'
import { loggers } from '../../../../kernel/shared/logger'

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
  constructor(
    @inject(IPlayerInfo as any) private readonly playerInfo: IPlayerInfo,
    @inject(IExports as any) private readonly exportsService: IExports,
  ) {
    super()
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
      this.playerInfo,
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
      return new Player({ clientID, meta: {} }, this.playerInfo)
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
      // Fallback to FiveM natives
      const players: Player[] = []
      const numPlayers = GetNumPlayerIndices()
      for (let i = 0; i < numPlayers; i++) {
        const src = parseInt(GetPlayerFromIndex(i))
        players.push(new Player({ clientID: src, meta: {} }, this.playerInfo))
      }
      return players
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
      return GetNumPlayerIndices()
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
