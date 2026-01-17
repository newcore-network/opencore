import { LogLevel, parseLogLevel } from './logger.types'

type LOG_LEVEL = 'TRACE' | 'DEBUG' | 'INFO' | 'WARN' | 'ERROR' | 'FATAL' | 'OFF'

/**
 * Global log level constant.
 * This value is injected at build-time by the OpenCore CLI based on `opencore.config.ts`.
 *
 * @remarks
 * The CLI uses string replacement during the build process to substitute `__OPENCORE_LOG_LEVEL__`
 * with the literal value from the configuration.
 */
declare const __OPENCORE_LOG_LEVEL__: LOG_LEVEL | undefined

/**
 * Global build target constant.
 * Injected at build-time to identify the execution side.
 */
declare const __OPENCORE_TARGET__: 'client' | 'server' | undefined

/**
 * Detects the current runtime environment side.
 *
 * @returns 'client' | 'server' | 'node'
 */
export function detectEnvironmentSide(): 'client' | 'server' | 'node' {
  if (typeof __OPENCORE_TARGET__ !== 'undefined') {
    return __OPENCORE_TARGET__
  }
  if (
    typeof (globalThis as any).GetPlayerPed === 'function' &&
    typeof (globalThis as any).GetNumPlayerIndices !== 'function'
  ) {
    return 'client'
  }
  if (typeof (globalThis as any).GetNumPlayerIndices === 'function') {
    return 'server'
  }
  return 'node'
}

/**
 * Detects if we're running in a FiveM client environment.
 */
export function isClientEnvironment(): boolean {
  return detectEnvironmentSide() === 'client'
}

/**
 * Detects if we're running in a FiveM server environment.
 */
export function isServerEnvironment(): boolean {
  return detectEnvironmentSide() === 'server'
}

/**
 * Detects if we're running in a FiveM environment (client or server).
 */
export function isFiveMEnvironment(): boolean {
  const side = detectEnvironmentSide()
  return side === 'client' || side === 'server'
}

/**
 * Gets the globally configured log level for the framework.
 *
 * @remarks
 * The log level is resolved in the following order:
 * 1. Build-time injection (`__OPENCORE_LOG_LEVEL__`) via CLI.
 * 2. Fallback to `INFO` level.
 *
 * @returns The resolved {@link LogLevel}
 */
export function getLogLevel(): LogLevel {
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
