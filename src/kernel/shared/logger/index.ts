// Types

// Core Logger (internal framework use)
export { coreLogger, loggers } from './core-logger'
export type { LoggerConfig } from './logger.config'

// Config
export { createLoggerConfig, DEFAULT_LOGGER_CONFIG } from './logger.config'
// Environment utilities
export {
  getLogLevel,
  isClientEnvironment,
  isDebugMode,
  isFiveMEnvironment,
  isServerEnvironment,
} from './logger.env'

// Service
export { ChildLogger, LoggerService } from './logger.service'
export type { LogContext, LogEntry } from './logger.types'
export { LogDomain, LogDomainLabels, LogLevel, LogLevelLabels, parseLogLevel } from './logger.types'
export type { BufferedTransportOptions, LogOutputFormat } from './transports/buffered.transport'
export { BufferedTransport } from './transports/buffered.transport'
export type { ConsoleTransportOptions } from './transports/console.transport'
export { ConsoleTransport } from './transports/console.transport'
export type { SimpleConsoleTransportOptions } from './transports/simple-console.transport'
export { SimpleConsoleTransport } from './transports/simple-console.transport'
// Transports
export type { LogTransport } from './transports/transport.interface'
