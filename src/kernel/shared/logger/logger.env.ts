import { LogLevel, parseLogLevel } from './logger.types'

/**
 * Detects if we're running in a FiveM client environment.
 * Client has GetPlayerPed but not GetCurrentResourceName with player count natives.
 */
export function isClientEnvironment(): boolean {
  return (
    typeof (globalThis as any).GetPlayerPed === 'function' &&
    typeof (globalThis as any).GetNumPlayerIndices !== 'function'
  )
}

/**
 * Detects if we're running in a FiveM server environment.
 */
export function isServerEnvironment(): boolean {
  return typeof (globalThis as any).GetNumPlayerIndices === 'function'
}

/**
 * Detects if we're running in a FiveM environment (client or server).
 */
export function isFiveMEnvironment(): boolean {
  return isClientEnvironment() || isServerEnvironment()
}

/**
 * Gets the log level from FiveM convar or environment variable.
 *
 * Priority:
 * 1. FiveM convar: `opencore_log_level`
 * 2. Default: INFO for production-like behavior
 *
 * @example
 * ```lua
 * -- In server.cfg
 * set opencore_log_level "DEBUG"
 * ```
 *
 * @returns The configured LogLevel
 */
export function getLogLevelFromEnv(): LogLevel {
  // Try FiveM convar first
  if (isFiveMEnvironment()) {
    try {
      const GetConvar = (globalThis as any).GetConvar
      if (typeof GetConvar === 'function') {
        const convarValue = GetConvar('opencore_log_level', 'INFO')
        return parseLogLevel(convarValue)
      }
    } catch {
      // Ignore errors, fall through to default
    }
  }

  // Default to INFO for production-like behavior
  return LogLevel.INFO
}

/**
 * Checks if debug mode is enabled based on log level.
 * Debug mode is enabled when log level is DEBUG or TRACE.
 */
export function isDebugMode(): boolean {
  const level = getLogLevelFromEnv()
  return level <= LogLevel.DEBUG
}
