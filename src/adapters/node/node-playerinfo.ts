import type { Vector3 } from '../../kernel'
import type { IPlayerInfo } from '../contracts/IPlayerInfo'

export class NodePlayerInfo implements IPlayerInfo {
  getPlayerName(clientId: number): string | null {
    return 'Player' + clientId.toString()
  }
  getPlayerPosition(_clientId: number): Vector3 | undefined {
    return { x: 6, y: 7, z: 6 }
  }
}
