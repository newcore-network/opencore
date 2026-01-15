/**
 * Generic player identifier structure.
 *
 * @remarks
 * Platform-agnostic representation of player identifiers.
 * Different platforms use different identifier systems:
 * - FiveM: steam, license, discord, fivem, ip
 * - RageMP: socialclub, ip
 * - alt:V: socialclub, hwid, ip
 */
export interface PlayerIdentifier {
  /**
   * Identifier type.
   * @example 'steam', 'license', 'discord', 'socialclub', 'hwid'
   */
  type: string

  /**
   * Raw identifier value (without the type prefix).
   * @example '110000100000001' (steam ID)
   */
  value: string

  /**
   * Full identifier string as provided by the platform.
   * @example 'steam:110000100000001'
   */
  raw: string
}

/**
 * Well-known identifier types across platforms.
 */
export const IdentifierTypes = {
  // Common across multiple platforms
  STEAM: 'steam',
  IP: 'ip',

  // FiveM specific
  LICENSE: 'license',
  LICENSE2: 'license2',
  DISCORD: 'discord',
  FIVEM: 'fivem',
  XBL: 'xbl',
  LIVE: 'live',

  // RageMP / alt:V specific
  SOCIAL_CLUB: 'socialclub',
  HWID: 'hwid',

  // RedM specific
  ROCKSTAR: 'rockstar',
} as const

export type IdentifierType = (typeof IdentifierTypes)[keyof typeof IdentifierTypes]

/**
 * Parse a raw identifier string into a PlayerIdentifier.
 *
 * @param raw - Raw identifier string (e.g., 'steam:110000100000001')
 * @returns Parsed identifier or null if invalid format
 */
export function parseIdentifier(raw: string): PlayerIdentifier | null {
  const colonIndex = raw.indexOf(':')
  if (colonIndex === -1) {
    return null
  }

  const type = raw.substring(0, colonIndex)
  const value = raw.substring(colonIndex + 1)

  if (!type || !value) {
    return null
  }

  return { type, value, raw }
}

/**
 * Create a raw identifier string from type and value.
 *
 * @param type - Identifier type
 * @param value - Identifier value
 * @returns Raw identifier string
 */
export function createIdentifier(type: string, value: string): string {
  return `${type}:${value}`
}

/**
 * Find an identifier by type from a list.
 *
 * @param identifiers - List of identifiers
 * @param type - Type to find
 * @returns The identifier or undefined
 */
export function findIdentifierByType(
  identifiers: PlayerIdentifier[],
  type: string,
): PlayerIdentifier | undefined {
  return identifiers.find((id) => id.type === type)
}
