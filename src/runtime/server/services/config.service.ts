import { Bind } from '../decorators'

/**
 * Generic configuration service for accessing FiveM Convars.
 *
 * Provides type-safe access to configuration values with automatic
 * prefix handling and type conversion.
 *
 * All keys are automatically prefixed with `opencore_`.
 *
 * @example
 * ```ts
 * const config = di.resolve(ConfigService)
 *
 * // Get string value
 * const apiUrl = config.get('api_url', 'http://localhost:3000')
 *
 * // Get number value
 * const timeout = config.getNumber('timeout', 5000)
 *
 * // Get boolean value
 * const debug = config.getBoolean('debug', false)
 *
 * // Get required value (throws if not set)
 * const secretKey = config.getRequired('secret_key')
 *
 * // Get JSON value
 * const settings = config.getJson('settings', { enabled: true })
 * ```
 *
 * @scope Singleton
 */
@Bind('singleton')
export class ConfigService {
  private readonly PREFIX = 'opencore_'

  /**
   * Gets a string configuration value.
   *
   * @param key - The configuration key (without prefix)
   * @param defaultValue - Default value if not set
   * @returns The configuration value or default
   */
  get(key: string, defaultValue: string): string {
    return GetConvar(this.PREFIX + key, defaultValue)
  }

  /**
   * Gets a numeric configuration value.
   *
   * @param key - The configuration key (without prefix)
   * @param defaultValue - Default value if not set or invalid
   * @returns The configuration value as number
   */
  getNumber(key: string, defaultValue: number): number {
    const value = GetConvar(this.PREFIX + key, String(defaultValue))
    const parsed = Number(value)
    return Number.isNaN(parsed) ? defaultValue : parsed
  }

  /**
   * Gets a boolean configuration value.
   *
   * Recognizes 'true', '1' as true, everything else as false.
   *
   * @param key - The configuration key (without prefix)
   * @param defaultValue - Default value if not set
   * @returns The configuration value as boolean
   */
  getBoolean(key: string, defaultValue: boolean): boolean {
    const value = GetConvar(this.PREFIX + key, String(defaultValue))
    return value === 'true' || value === '1'
  }

  /**
   * Gets a required configuration value.
   *
   * @param key - The configuration key (without prefix)
   * @returns The configuration value
   * @throws Error if the value is not set
   */
  getRequired(key: string): string {
    const value = GetConvar(this.PREFIX + key, '')
    if (!value) {
      throw new Error(`[OpenCore] Configuration '${this.PREFIX}${key}' is required but not set`)
    }
    return value
  }

  /**
   * Gets a JSON configuration value.
   *
   * @param key - The configuration key (without prefix)
   * @param defaultValue - Default value if not set or invalid JSON
   * @returns The parsed JSON value or default
   */
  getJson<T>(key: string, defaultValue: T): T {
    const value = GetConvar(this.PREFIX + key, '')
    if (!value) return defaultValue
    try {
      return JSON.parse(value) as T
    } catch {
      return defaultValue
    }
  }
}
