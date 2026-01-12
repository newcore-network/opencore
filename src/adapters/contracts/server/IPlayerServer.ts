/**
 * Server-side player operations adapter.
 *
 * @remarks
 * Abstracts FiveM player natives for server-side operations.
 * Allows the runtime to work without direct FiveM dependencies.
 */
export abstract class IPlayerServer {
  /**
   * Gets the ped handle for a player.
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
   * Gets a player identifier by type.
   *
   * @param playerSrc - Player source/client ID (as string)
   * @param identifierType - Identifier type (e.g., 'license', 'steam', 'discord')
   * @returns Identifier string or undefined
   */
  abstract getIdentifier(playerSrc: string, identifierType: string): string | undefined

  /**
   * Gets all identifiers for a player.
   *
   * @param playerSrc - Player source/client ID (as string)
   * @returns Array of identifier strings
   */
  abstract getIdentifiers(playerSrc: string): string[]

  /**
   * Gets the number of player identifiers.
   *
   * @param playerSrc - Player source/client ID (as string)
   * @returns Number of identifiers
   */
  abstract getNumIdentifiers(playerSrc: string): number

  /**
   * Gets player name.
   *
   * @param playerSrc - Player source/client ID (as string)
   * @returns Player name
   */
  abstract getName(playerSrc: string): string

  /**
   * Gets player ping.
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
   * Sets player routing bucket.
   *
   * @param playerSrc - Player source/client ID (as string)
   * @param bucket - Routing bucket ID
   */
  abstract setRoutingBucket(playerSrc: string, bucket: number): void

  /**
   * Gets all currently connected player sources.
   *
   * @remarks
   * Returns the source IDs (as strings) of all players currently connected to the server.
   * Used for session recovery after resource restarts.
   *
   * @returns Array of player source strings
   */
  abstract getConnectedPlayers(): string[]
}
