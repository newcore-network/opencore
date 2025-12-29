import type { Vector3 } from '../../kernel'
import type { IPlayerInfo } from '../contracts/IPlayerInfo'

export class FiveMPlayerInfo implements IPlayerInfo {
  getPlayerName(clientId: number): string | null {
    return GetPlayerName(clientId)
  }
  getPlayerPosition(clientId: number): Vector3 | undefined {
    const ped = GetPlayerPed(clientId)
    const [x, y, z] = GetEntityCoords(ped, false)
    return { x, y, z }
  }
}
