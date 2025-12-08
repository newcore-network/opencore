import type { Player } from '../../entities'

export abstract class PlayerServiceContract {
  abstract getByClient(clientID: number): Player | null
  abstract getAll(): Player[]
  abstract getPlayerId(clientID: number): string | null

  abstract getMeta<T = unknown>(clientID: number, key: string): Promise<T | undefined>
  abstract setMeta(clientID: number, key: string, value: unknown): void
}
