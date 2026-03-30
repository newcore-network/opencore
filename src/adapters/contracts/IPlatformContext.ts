export type platforms = 'node' | 'fivem' | 'ragemp' | 'redm'

/**
 * Platform context contract.
 *
 * Keeps the stable runtime information the framework actually uses across
 * platforms, without exposing a generic feature registry.
 */
export abstract class IPlatformContext {
  /**
   * Unique platform identifier.
   * @example 'node', 'fivem', 'ragemp', 'redm'
   */
  abstract readonly platformName: platforms | string

  /**
   * Human-readable display name.
   */
  abstract readonly displayName: string

  /**
   * Supported identifier types for this platform.
   */
  abstract readonly identifierTypes: readonly string[]

  /**
   * Maximum number of players supported by the platform.
   * Returns undefined if unlimited or unknown.
   */
  abstract readonly maxPlayers: number | undefined

  /**
   * Coarse game profile used by the framework.
   */
  abstract readonly gameProfile: 'gta5' | 'rdr3' | 'common'

  /**
   * Default player model used when no explicit model is provided.
   */
  abstract readonly defaultSpawnModel: string

  /**
   * Default vehicle type used for server-side spawning.
   */
  abstract readonly defaultVehicleType: string

  /**
   * Whether server-side vehicle creation should be enabled.
   */
  abstract readonly enableServerVehicleCreation: boolean
}
