import { getLogLevel, isClientEnvironment } from './logger.env'
import { LoggerService } from './logger.service'
import { LogDomain } from './logger.types'
import { ConsoleTransport } from './transports/console.transport'
import { SimpleConsoleTransport } from './transports/simple-console.transport'
import type { LogTransport } from './transports/transport.interface'

/**
 * Creates the appropriate transport based on the runtime environment.
 * - Client: SimpleConsoleTransport (no ANSI colors)
 * - Server: ConsoleTransport (with ANSI colors)
 */
function createTransport(): LogTransport {
  const logLevel = getLogLevel()

  if (isClientEnvironment()) {
    return new SimpleConsoleTransport({
      minLevel: logLevel,
      timestamps: true,
      showContext: false,
    })
  }

  return new ConsoleTransport({
    minLevel: logLevel,
    colors: true,
    timestamps: true,
  })
}

/**
 * Singleton logger instance for internal OpenCore framework use.
 *
 * This logger is pre-configured for framework-level logging and should only
 * be used by OpenCore internals. Resource developers should inject LoggerService
 * via DI instead.
 *
 * Configuration:
 * - Set `logLevel` in opencore.config.ts to control log verbosity
 * - Values: TRACE, DEBUG, INFO, WARN, ERROR, FATAL, OFF
 * - Default: INFO
 *
 * @example
 * ```typescript
 * // opencore.config.ts
 * export default {
 *   logLevel: 'DEBUG',
 * }
 * ```
 *
 * @internal
 */
export const coreLogger = new LoggerService({
  minLevel: getLogLevel(),
  defaultDomain: LogDomain.FRAMEWORK,
  defaultSource: 'Core',
  transports: [createTransport()],
})

// Pre-configured child loggers for common framework components
export const loggers = {
  /** Bootstrap and initialization logs */
  bootstrap: coreLogger.framework('Bootstrap'),
  /** Metadata scanning and decorator processing */
  scanner: coreLogger.framework('Scanner'),
  /** Player session management */
  session: coreLogger.framework('Session'),
  /** Command registration and execution */
  command: coreLogger.framework('Command'),
  /** Network events processing */
  netEvent: coreLogger.framework('NetEvent'),
  /** Security violations and access control */
  security: coreLogger.framework('Security'),
  /** Core event bus */
  eventBus: coreLogger.framework('EventBus'),
  /** Export registration */
  exports: coreLogger.framework('Exports'),
  /** Tick handlers (server) */
  tick: coreLogger.framework('Tick'),
  /** NUI callbacks (client) */
  nui: coreLogger.client('NUI'),
  /** Spawn service (client) */
  spawn: coreLogger.client('Spawn'),
}
