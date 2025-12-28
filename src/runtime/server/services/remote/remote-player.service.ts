import { inject, injectable } from 'tsyringe'
import { Player } from '../../entities'
import { getRuntimeContext } from '../../runtime'
import { PlayerDirectoryPort } from '../ports/player-directory.port'
import { IPlayerInfo } from '../../../../adapters'

/**
 * Player service implementation for `RESOURCE` mode.
 *
 * @remarks
 * This service does not own the authoritative player session data.
 * It provides a thin proxy over core exports and returns locally constructed {@link Player}
 * instances for convenience.
 */
@injectable()
export class RemotePlayerService extends PlayerDirectoryPort {
  constructor(@inject(IPlayerInfo as any) private readonly playerInfo: IPlayerInfo) {
    super()
  }

  private get core() {
    const { coreResourceName } = getRuntimeContext()
    return (exports as any)[coreResourceName]
  }

  /**
   * Returns a local {@link Player} instance for a client ID.
   *
   * @remarks
   * The returned instance is not backed by the core session store.
   * Methods that depend on server-side session state may not behave the same as in CORE mode.
   */
  getByClient(clientID: number): Player | undefined {
    return new Player({ clientID, meta: {} }, this.playerInfo)
  }

  getAll(): Player[] {
    const players: Player[] = []
    const numPlayers = GetNumPlayerIndices()
    for (let i = 0; i < numPlayers; i++) {
      const src = parseInt(GetPlayerFromIndex(i))
      players.push(new Player({ clientID: src, meta: {} }, this.playerInfo))
    }
    return players
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
}
