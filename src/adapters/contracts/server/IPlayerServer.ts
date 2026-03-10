import type { PlayerIdentifier } from '../types/identifier'

/**
 * Server-side player operations adapter.
 *
 * @remarks
 * Abstracts player natives for server-side operations across different platforms.
 * Allows the runtime to work without direct platform dependencies.
 */
export abstract class IPlayerServer {
  /**
   * Gets the ped/character handle for a player.
   *
   * @param playerSrc - Player source/client ID (as string)
   * @returns Ped entity handle
   */
  abstract getPed(playerSrc: string): number

  /**
   * Drops (kicks) a player from the server.
   *
   * @param playerSrc - Player source/client ID (as string)
   * @param reason - Kick reason message
   */
  abstract drop(playerSrc: string, reason: string): void

  /**
   * Sets the active player model when the runtime supports it.
   */
  abstract setModel(playerSrc: string, model: string): void

  /**
   * Gets a player identifier by type.
   *
   * @param playerSrc - Player source/client ID (as string)
   * @param identifierType - Identifier type (e.g., 'license', 'steam', 'discord')
   * @returns Identifier string or undefined
   */
  abstract getIdentifier(playerSrc: string, identifierType: string): string | undefined // TODO: DELETE

  /**
   * Gets all identifiers for a player as structured objects.
   *
   * @param playerSrc - Player source/client ID (as string)
   * @returns Array of PlayerIdentifier objects
   */
  abstract getPlayerIdentifiers(playerSrc: string): PlayerIdentifier[] // TODO: DELETE

  /**
   * Gets the number of player identifiers.
   *
   * @param playerSrc - Player source/client ID (as string)
   * @returns Number of identifiers
   */
  abstract getNumIdentifiers(playerSrc: string): number // TODO: DELETE

  /**
   * Gets player display name.
   *
   * @param playerSrc - Player source/client ID (as string)
   * @returns Player name
   */
  abstract getName(playerSrc: string): string

  /**
   * Gets player ping/latency.
   *
   * @param playerSrc - Player source/client ID (as string)
   * @returns Ping in milliseconds
   */
  abstract getPing(playerSrc: string): number

  /**
   * Gets player endpoint (IP:port).
   *
   * @param playerSrc - Player source/client ID (as string)
   * @returns Endpoint string
   */
  abstract getEndpoint(playerSrc: string): string

  /**
   * Sets player routing bucket (virtual world/dimension).
   *
   * @remarks
   * Not all platforms support routing buckets.
   * Use IPlatformCapabilities.supportsRoutingBuckets to check support.
   *
   * @param playerSrc - Player source/client ID (as string)
   * @param bucket - Routing bucket ID
   */
  abstract setDimension(playerSrc: string, bucket: number): void

  /**
   * Gets player routing bucket (virtual world/dimension).
   *
   * @param playerSrc - Player source/client ID (as string)
   * @returns Routing bucket ID (0 is default world)
   */
  abstract getDimension(playerSrc: string): number

  /**
   * Gets all currently connected player sources.
   *
   * @remarks
   * Returns the source IDs (as strings) of all players currently connected.
   * Used for session recovery after resource restarts.
   *
   * @returns Array of player source strings
   */
  abstract getConnectedPlayers(): string[]
}
