import { LogDomain, LogLevel } from './logger.types'
import { ConsoleTransport } from './transports/console.transport'
import { LogTransport } from './transports/transport.interface'

/**
 * Global configuration options for the LoggerService.
 */
export interface LoggerConfig {
  /**
   * Global minimum log level. Logs below this level will be ignored entirely.
   * Individual transports can have their own minLevel that's higher than this.
   * @default LogLevel.DEBUG
   */
  minLevel: LogLevel

  /**
   * Default domain/origin for logs when none is provided.
   * @default LogDomain.SERVER
   */
  defaultDomain: LogDomain

  /**
   * Default source name to use when none is provided.
   * @default 'App'
   */
  defaultSource: string

  /**
   * Array of transports that will receive log entries.
   * If empty, a default ConsoleTransport will be used.
   */
  transports: LogTransport[]
}

/**
 * Default configuration used when no custom config is provided.
 */
export const DEFAULT_LOGGER_CONFIG: LoggerConfig = {
  minLevel: LogLevel.DEBUG,
  defaultDomain: LogDomain.SERVER,
  defaultSource: 'App',
  transports: [new ConsoleTransport()],
}

/**
 * Creates a new logger configuration by merging with defaults.
 *
 * @example
 * ```typescript
 * const config = createLoggerConfig({
 *   minLevel: LogLevel.INFO,
 *   transports: [
 *     new ConsoleTransport({ colors: true }),
 *     new MyCustomFileTransport()
 *   ]
 * })
 * ```
 */
export function createLoggerConfig(partial: Partial<LoggerConfig>): LoggerConfig {
  return {
    ...DEFAULT_LOGGER_CONFIG,
    ...partial,
    transports: partial.transports ?? DEFAULT_LOGGER_CONFIG.transports,
  }
}
