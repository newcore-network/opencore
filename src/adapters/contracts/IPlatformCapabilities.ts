/**
 * Platform capabilities contract.
 *
 * @remarks
 * Defines what features a platform supports, allowing runtime
 * feature detection and graceful degradation across different
 * game engines (CitizenFX, RageMP, alt:V, etc.)
 */
export abstract class IPlatformCapabilities {
  /**
   * Unique identifier for the platform.
   * @example 'cfx', 'ragemp', 'altv', 'redm'
   */
  abstract readonly platformName: string

  /**
   * Human-readable display name.
   * @example 'CitizenFX', 'RageMP', 'alt:V', 'RedM'
   */
  abstract readonly displayName: string

  /**
   * Whether the platform supports routing buckets (virtual worlds/dimensions).
   */
  abstract readonly supportsRoutingBuckets: boolean

  /**
   * Whether the platform supports state bags for entity synchronization.
   */
  abstract readonly supportsStateBags: boolean

  /**
   * Whether the platform has native voice chat support.
   */
  abstract readonly supportsVoiceChat: boolean

  /**
   * Whether the platform supports server-side entity creation.
   */
  abstract readonly supportsServerEntities: boolean

  /**
   * Supported identifier types for this platform.
   * @example ['steam', 'license', 'discord'] for FiveM
   * @example ['socialclub', 'ip'] for RageMP
   */
  abstract readonly identifierTypes: readonly string[]

  /**
   * Maximum number of players supported by the platform.
   * Returns undefined if unlimited or unknown.
   */
  abstract readonly maxPlayers: number | undefined

  /**
   * Check if a specific feature is supported.
   *
   * @param feature - Feature identifier to check
   * @returns true if the feature is supported
   */
  abstract isFeatureSupported(feature: string): boolean

  /**
   * Get platform-specific configuration value.
   *
   * @param key - Configuration key
   * @returns Configuration value or undefined
   */
  abstract getConfig<T = unknown>(key: string): T | undefined
}

/**
 * Well-known feature identifiers for cross-platform compatibility.
 */
export const PlatformFeatures = {
  ROUTING_BUCKETS: 'routing_buckets',
  STATE_BAGS: 'state_bags',
  VOICE_CHAT: 'voice_chat',
  SERVER_ENTITIES: 'server_entities',
  VEHICLE_MODS: 'vehicle_mods',
  PED_APPEARANCE: 'ped_appearance',
  WEAPON_COMPONENTS: 'weapon_components',
  BLIPS: 'blips',
  MARKERS: 'markers',
  TEXT_LABELS: 'text_labels',
  CHECKPOINTS: 'checkpoints',
  COLSHAPES: 'colshapes',
} as const

export type PlatformFeature = (typeof PlatformFeatures)[keyof typeof PlatformFeatures]
