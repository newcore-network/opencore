import { inject, injectable } from 'tsyringe'
import { IExports, IPlayerInfo } from '../../../../adapters'
import { IPlatformContext } from '../../../../adapters/contracts/IPlatformContext'
import { EventsAPI } from '../../../../adapters/contracts/transport/events.api'
import { IEntityServer } from '../../../../adapters/contracts/server/IEntityServer'
import { IPlayerLifecycleServer } from '../../../../adapters/contracts/server/player-lifecycle/IPlayerLifecycleServer'
import { IPlayerStateSyncServer } from '../../../../adapters/contracts/server/player-state/IPlayerStateSyncServer'
import { IPlayerServer } from '../../../../adapters/contracts/server/IPlayerServer'
import { loggers } from '../../../../kernel/logger'
import { createLocalServerPlayer, createRemoteServerPlayer } from '../../adapter/registry'
import { Player, type PlayerAdapters } from '../../entities'
import { getRuntimeContext } from '../../runtime'
import { InternalPlayerExports, SerializedPlayerData } from '../../types/core-exports.types'
import { Players } from '../../ports/players.api-port'
import { LinkedID } from '../../services'

/**
 * Player service implementation for `RESOURCE` mode.
 *
 * @remarks
 * This service delegates all player operations to CORE via exports.
 * It creates local Player instances hydrated with real session data from CORE,
 * ensuring RESOURCE mode has access to accurate player information.
 */
@injectable()
export class RemotePlayerImplementation extends Players {
  /**
   * Cached adapters bundle for Player instances
   */
  private readonly playerAdapters: PlayerAdapters

  constructor(
    @inject(IPlayerInfo as any) private readonly playerInfo: IPlayerInfo,
    @inject(IExports as any) private readonly exportsService: IExports,
    @inject(IPlayerServer as any) private readonly playerServer: IPlayerServer,
    @inject(IPlayerLifecycleServer as any)
    private readonly playerLifecycle: IPlayerLifecycleServer,
    @inject(IPlayerStateSyncServer as any)
    private readonly playerStateSync: IPlayerStateSyncServer,
    @inject(IEntityServer as any) private readonly entityServer: IEntityServer,
    @inject(EventsAPI as any) private readonly events: EventsAPI<'server'>,
    @inject(IPlatformContext as any)
    private readonly platformContext: IPlatformContext,
  ) {
    super()
    const defaultSpawnModel = this.platformContext.defaultSpawnModel

    this.playerAdapters = {
      playerInfo: this.playerInfo,
      playerServer: this.playerServer,
      playerLifecycle: this.playerLifecycle,
      playerStateSync: this.playerStateSync,
      entityServer: this.entityServer,
      events: this.events,
      defaultSpawnModel,
    }
  }

  /**
   * Gets typed access to CORE resource exports.
   */
  private get core(): InternalPlayerExports {
    const { coreResourceName } = getRuntimeContext()
    const coreExports = this.exportsService.getResource<InternalPlayerExports>(coreResourceName)

    if (!coreExports) {
      throw new Error(
        `[OpenCore] CORE resource '${coreResourceName}' exports not found. ` +
          `Ensure the CORE resource is started BEFORE RESOURCE mode resources.`,
      )
    }

    return coreExports
  }

  private createPlayerFromData(data: SerializedPlayerData): Player {
    const player = createRemoteServerPlayer(data, this.playerAdapters)
    this.attachAuthoritativeMutators(player)
    return player
  }

  /**
   * Proxies remote session mutations to CORE so security-critical data remains authoritative.
   */
  private attachAuthoritativeMutators(player: Player): void {
    const core = this.core
    const originalSetMeta = player.setMeta.bind(player)
    const originalLinkAccount = player.linkAccount.bind(player)
    const originalUnlinkAccount = player.unlinkAccount.bind(player)
    const originalAddState = player.addState.bind(player)
    const originalRemoveState = player.removeState.bind(player)
    const originalToggleState = player.toggleState.bind(player)

    player.setMeta = <T = unknown>(key: string, value: T): void => {
      core.setPlayerMeta(player.clientID, key, value)
      originalSetMeta(key, value)
      loggers.session.debug('Remote player meta delegated to CORE', {
        clientID: player.clientID,
        key,
      })
    }

    player.linkAccount = (accountID): void => {
      core.linkPlayerAccount(player.clientID, accountID.toString())
      originalLinkAccount(accountID)
      loggers.session.debug('Remote player linkAccount delegated to CORE', {
        clientID: player.clientID,
        accountID: accountID.toString(),
      })
    }

    player.unlinkAccount = (): void => {
      const previousAccountID = player.accountID
      core.unlinkPlayerAccount(player.clientID)
      originalUnlinkAccount()
      loggers.session.debug('Remote player unlinkAccount delegated to CORE', {
        clientID: player.clientID,
        accountID: previousAccountID,
      })
    }

    player.addState = (state: string): void => {
      core.addPlayerState(player.clientID, state)
      originalAddState(state)
      loggers.session.debug('Remote player state added in CORE', {
        clientID: player.clientID,
        state,
      })
    }

    player.removeState = (state: string): void => {
      core.removePlayerState(player.clientID, state)
      originalRemoveState(state)
      loggers.session.debug('Remote player state removed in CORE', {
        clientID: player.clientID,
        state,
      })
    }

    player.toggleState = (state: string, force?: boolean): boolean => {
      const next = force ?? !player.hasState(state)
      if (next) {
        player.addState(state)
      } else {
        player.removeState(state)
      }

      originalToggleState(state, next)
      return next
    }
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
      return createLocalServerPlayer({ clientID, meta: {} }, this.playerAdapters)
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

  getAccountLinked(clientID: number): LinkedID | undefined {
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
