import { injectable } from 'tsyringe'
import { IPlayerServer } from '../contracts/server/IPlayerServer'
import { type PlayerIdentifier, parseIdentifier } from '../contracts/types/identifier'

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
      routingBucket: number
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

  /**
   * @deprecated Use getPlayerIdentifiers() for structured identifier data.
   */
  getIdentifiers(playerSrc: string): string[] {
    return this.players.get(playerSrc)?.identifiers ?? []
  }

  getPlayerIdentifiers(playerSrc: string): PlayerIdentifier[] {
    const rawIdentifiers = this.getIdentifiers(playerSrc)
    const identifiers: PlayerIdentifier[] = []

    for (const raw of rawIdentifiers) {
      const parsed = parseIdentifier(raw)
      if (parsed) {
        identifiers.push(parsed)
      }
    }

    return identifiers
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

  setRoutingBucket(playerSrc: string, bucket: number): void {
    const player = this.players.get(playerSrc)
    if (player) {
      player.routingBucket = bucket
    }
  }

  getRoutingBucket(playerSrc: string): number {
    return this.players.get(playerSrc)?.routingBucket ?? 0
  }

  getConnectedPlayers(): string[] {
    return Array.from(this.players.keys())
  }

  // ─────────────────────────────────────────────────────────────────
  // Test Helpers
  // ─────────────────────────────────────────────────────────────────

  /**
   * Add a mock player for testing.
   */
  _addMockPlayer(
    playerSrc: string,
    data: {
      ped?: number
      name?: string
      identifiers?: string[]
      ping?: number
      endpoint?: string
      routingBucket?: number
    },
  ): void {
    this.players.set(playerSrc, {
      ped: data.ped ?? 0,
      name: data.name ?? 'TestPlayer',
      identifiers: data.identifiers ?? [],
      ping: data.ping ?? 50,
      endpoint: data.endpoint ?? '127.0.0.1:30120',
      routingBucket: data.routingBucket ?? 0,
    })
  }

  /**
   * Check if a player was dropped.
   */
  _wasDropped(playerSrc: string): boolean {
    return this.droppedPlayers.includes(playerSrc)
  }

  /**
   * Clear all mock data.
   */
  _clear(): void {
    this.players.clear()
    this.droppedPlayers = []
  }
}
