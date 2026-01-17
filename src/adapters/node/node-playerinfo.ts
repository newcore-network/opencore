import { injectable } from 'tsyringe'
import { Vector3 } from '../../kernel'
import { IPlayerInfo } from '../contracts/IPlayerInfo'

@injectable()
export class NodePlayerInfo extends IPlayerInfo {
  getPlayerName(clientId: number): string | null {
    return `Player${clientId.toString()}`
  }

  getPlayerPosition(_clientId: number): Vector3 {
    return { x: 0, y: 0, z: 0 }
  }
}
