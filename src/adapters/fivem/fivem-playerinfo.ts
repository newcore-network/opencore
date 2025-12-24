import { type IPlayerInfo } from '../contracts/IPlayerInfo'

export class FiveMPlayerInfo implements IPlayerInfo {
  getPlayerName(clientId: number): string | null {
    return GetPlayerName(clientId)
  }
}
