// Types
export { LogLevel, LogLevelLabels, LogDomain, LogDomainLabels, parseLogLevel } from './logger.types'
export type { LogContext, LogEntry } from './logger.types'

// Config
export { createLoggerConfig, DEFAULT_LOGGER_CONFIG } from './logger.config'
export type { LoggerConfig } from './logger.config'

// Service
export { LoggerService, ChildLogger } from './logger.service'

// Core Logger (internal framework use)
export { coreLogger, loggers } from './core-logger'

// Transports
export type { LogTransport } from './transports/transport.interface'
export { ConsoleTransport } from './transports/console.transport'
export type { ConsoleTransportOptions } from './transports/console.transport'
export { SimpleConsoleTransport } from './transports/simple-console.transport'
export type { SimpleConsoleTransportOptions } from './transports/simple-console.transport'
export { BufferedTransport } from './transports/buffered.transport'
export type { BufferedTransportOptions, LogOutputFormat } from './transports/buffered.transport'

// Environment utilities
export {
  isClientEnvironment,
  isServerEnvironment,
  isFiveMEnvironment,
  getLogLevel,
  isDebugMode,
} from './logger.env'
