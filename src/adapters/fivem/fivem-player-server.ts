import { injectable } from 'tsyringe'
import { IPlayerServer } from '../contracts/server/IPlayerServer'
import { type PlayerIdentifier, parseIdentifier } from '../contracts/types/identifier'

/**
 * FiveM implementation of server-side player operations.
 */
@injectable()
export class FiveMPlayerServer extends IPlayerServer {
  getPed(playerSrc: string): number {
    return GetPlayerPed(playerSrc)
  }

  drop(playerSrc: string, reason: string): void {
    DropPlayer(playerSrc, reason)
  }

  getIdentifier(playerSrc: string, identifierType: string): string | undefined {
    const numIdentifiers = this.getNumIdentifiers(playerSrc)
    const prefix = `${identifierType}:`

    for (let i = 0; i < numIdentifiers; i++) {
      const identifier = GetPlayerIdentifier(playerSrc, i)
      if (identifier?.startsWith(prefix)) {
        return identifier
      }
    }

    return undefined
  }

  /**
   * Get all identifiers registered.
   *
   * Use getPlayerIdentifiers() for structured identifier data.
   */
  getIdentifiers(playerSrc: string): string[] {
    const identifiers: string[] = []
    const numIdentifiers = this.getNumIdentifiers(playerSrc)

    for (let i = 0; i < numIdentifiers; i++) {
      const identifier = GetPlayerIdentifier(playerSrc, i)
      if (identifier) {
        identifiers.push(identifier)
      }
    }

    return identifiers
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
    return GetNumPlayerIdentifiers(playerSrc)
  }

  getName(playerSrc: string): string {
    return GetPlayerName(playerSrc) || 'Unknown'
  }

  getPing(playerSrc: string): number {
    return GetPlayerPing(playerSrc)
  }

  getEndpoint(playerSrc: string): string {
    return GetPlayerEndpoint(playerSrc) || ''
  }

  setRoutingBucket(playerSrc: string, bucket: number): void {
    SetPlayerRoutingBucket(playerSrc, bucket)
  }

  getRoutingBucket(playerSrc: string): number {
    return GetPlayerRoutingBucket(playerSrc)
  }

  getConnectedPlayers(): string[] {
    return getPlayers()
  }
}
