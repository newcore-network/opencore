import type { Vector3 } from '../../kernel'

export abstract class IPlayerInfo {
  abstract getPlayerName(clientId: number): string | null
  abstract getPlayerPosition(clientId: number): Vector3 | undefined
}
