import { type IPlayerInfo } from '../contracts/IPlayerInfo'

export class NodePlayerInfo implements IPlayerInfo {
  getPlayerName(clientId: number): string | null {
    return 'Player' + clientId.toString()
  }
}
