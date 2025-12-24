import { LogDomain, LogLevel } from './logger.types'
import { LoggerService } from './logger.service'
import { ConsoleTransport } from './transports/console.transport'

/**
 * Singleton logger instance for internal OpenCore framework use.
 *
 * This logger is pre-configured for framework-level logging and should only
 * be used by OpenCore internals. Resource developers should inject LoggerService
 * via DI instead.
 *
 * @internal
 */
export const coreLogger = new LoggerService({
  minLevel: LogLevel.DEBUG,
  defaultDomain: LogDomain.FRAMEWORK,
  defaultSource: 'Core',
  transports: [
    new ConsoleTransport({
      minLevel: LogLevel.DEBUG,
      colors: true,
      timestamps: true,
    }),
  ],
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
