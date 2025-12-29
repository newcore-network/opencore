import { injectable } from 'tsyringe'
import { IPlayerServer } from '../contracts/IPlayerServer'

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
      if (identifier && identifier.startsWith(prefix)) {
        return identifier
      }
    }

    return undefined
  }

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
}
