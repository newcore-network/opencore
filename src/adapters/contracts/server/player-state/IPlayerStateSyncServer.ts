export abstract class IPlayerStateSyncServer {
  abstract getHealth(playerSrc: string): number
  abstract setHealth(playerSrc: string, health: number): void
  abstract getArmor(playerSrc: string): number
  abstract setArmor(playerSrc: string, armor: number): void
}
