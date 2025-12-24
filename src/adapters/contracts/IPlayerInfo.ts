export abstract class IPlayerInfo {
  abstract getPlayerName(clientId: number): string | null
}
