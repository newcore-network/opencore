import type { Player } from '../../entities'

export abstract class PlayerDirectoryPort {
  abstract getByClient(clientID: number): Player | undefined
  abstract getAll(): Player[]
  abstract getPlayerId(clientID: number): string | undefined

  abstract getMeta<T = unknown>(clientID: number, key: string): Promise<T | undefined>
  abstract setMeta(clientID: number, key: string, value: unknown): void
}
