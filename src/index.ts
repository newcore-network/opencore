import 'reflect-metadata'

export * as Utils from './utils'
export * as Shared from './shared'

export * as Server from './server'
export * as Client from './client'

// Re-export logger at root level for convenience
export { LoggerService, LogLevel, LogDomain } from './shared/logger'
export type { LogTransport, LogContext, LogEntry, LoggerConfig } from './shared/logger'
