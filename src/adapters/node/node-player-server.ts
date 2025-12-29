import { injectable } from 'tsyringe'
import { IPlayerServer } from '../contracts/IPlayerServer'

/**
 * Node.js mock implementation of server-side player operations.
 * Used for testing and standalone mode.
 */
@injectable()
export class NodePlayerServer extends IPlayerServer {
  private players = new Map<
    string,
    {
      ped: number
      name: string
      identifiers: string[]
      ping: number
      endpoint: string
    }
  >()
  private droppedPlayers: string[] = []

  getPed(playerSrc: string): number {
    return this.players.get(playerSrc)?.ped ?? 0
  }

  drop(playerSrc: string, _reason: string): void {
    this.droppedPlayers.push(playerSrc)
    this.players.delete(playerSrc)
  }

  getIdentifier(playerSrc: string, identifierType: string): string | undefined {
    const player = this.players.get(playerSrc)
    if (!player) return undefined

    const prefix = `${identifierType}:`
    return player.identifiers.find((id) => id.startsWith(prefix))
  }

  getIdentifiers(playerSrc: string): string[] {
    return this.players.get(playerSrc)?.identifiers ?? []
  }

  getNumIdentifiers(playerSrc: string): number {
    return this.players.get(playerSrc)?.identifiers.length ?? 0
  }

  getName(playerSrc: string): string {
    return this.players.get(playerSrc)?.name ?? 'Unknown'
  }

  getPing(playerSrc: string): number {
    return this.players.get(playerSrc)?.ping ?? 0
  }

  getEndpoint(playerSrc: string): string {
    return this.players.get(playerSrc)?.endpoint ?? ''
  }

  // Test helpers
  _addMockPlayer(
    playerSrc: string,
    data: {
      ped?: number
      name?: string
      identifiers?: string[]
      ping?: number
      endpoint?: string
    },
  ): void {
    this.players.set(playerSrc, {
      ped: data.ped ?? 0,
      name: data.name ?? 'TestPlayer',
      identifiers: data.identifiers ?? [],
      ping: data.ping ?? 50,
      endpoint: data.endpoint ?? '127.0.0.1:30120',
    })
  }

  _wasDropped(playerSrc: string): boolean {
    return this.droppedPlayers.includes(playerSrc)
  }

  setRoutingBucket(_playerSrc: string, _bucket: number): void {
    // Mock: no-op in Node.js
  }

  _clear(): void {
    this.players.clear()
    this.droppedPlayers = []
  }
}
