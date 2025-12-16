import { injectable } from 'tsyringe'
import { Player } from '../../entities'
import { getRuntimeContext } from '../../runtime'
import { PlayerServiceContract } from '../contracts/player.service.contract'

@injectable()
export class RemotePlayerService extends PlayerServiceContract {
  private get core() {
    const { coreResourceName } = getRuntimeContext()
    return (exports as any)[coreResourceName]
  }

  /**
   * Note: This Player is a local instance, it does not have the actual data in 'session'
   * methods that require internal state will fail or must be adapted
   */
  getByClient(clientID: number): Player | null {
    if (GetPlayerName(clientID.toString())) {
      return new Player({ clientID, meta: {} })
    }
    return null
  }

  getAll(): Player[] {
    const players: Player[] = []
    const numPlayers = GetNumPlayerIndices()
    for (let i = 0; i < numPlayers; i++) {
      const src = parseInt(GetPlayerFromIndex(i))
      players.push(new Player({ clientID: src, meta: {} }))
    }
    return players
  }

  getPlayerId(clientID: number): string | null {
    return this.core.getPlayerId(clientID)
  }

  async getMeta<T = unknown>(clientID: number, key: string): Promise<T | undefined> {
    return this.core.getPlayerMeta(clientID, key)
  }

  setMeta(clientID: number, key: string, value: unknown): void {
    this.core.setPlayerMeta(clientID, key, value)
  }
}
