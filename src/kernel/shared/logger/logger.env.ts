import { LogLevel, parseLogLevel } from './logger.types'

/**
 * Global log level constant.
 * This value is injected at build-time by the OpenCore CLI based on opencore.config.ts
 *
 * @example
 * ```typescript
 * // opencore.config.ts
 * export default {
 *   logLevel: 'DEBUG', // 'TRACE' | 'DEBUG' | 'INFO' | 'WARN' | 'ERROR' | 'FATAL' | 'OFF'
 * }
 * ```
 *
 * The CLI will replace `__OPENCORE_LOG_LEVEL__` with the configured value during build.
 * Default: 'INFO' for production-like behavior.
 */
declare const __OPENCORE_LOG_LEVEL__: string | undefined

/**
 * Detects if we're running in a FiveM client environment.
 * Client has GetPlayerPed but not GetNumPlayerIndices (server-only native).
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
 * Gets the configured log level.
 *
 * The log level is determined at build-time from opencore.config.ts via the CLI.
 * If not configured, defaults to INFO.
 *
 * @returns The configured LogLevel
 */
export function getLogLevel(): LogLevel {
  // Use build-time injected value, fallback to INFO
  const level = typeof __OPENCORE_LOG_LEVEL__ !== 'undefined' ? __OPENCORE_LOG_LEVEL__ : 'INFO'
  return parseLogLevel(level)
}

/**
 * Checks if debug mode is enabled based on log level.
 * Debug mode is enabled when log level is DEBUG or TRACE.
 */
export function isDebugMode(): boolean {
  return getLogLevel() <= LogLevel.DEBUG
}
