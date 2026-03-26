/**
 * Log severity levels ordered from most verbose to most critical.
 * The numeric values allow for easy comparison and filtering.
 */
export enum LogLevel {
  TRACE = 0,
  DEBUG = 1,
  INFO = 2,
  WARN = 3,
  ERROR = 4,
  FATAL = 5,
  OFF = 6,
}

/**
 * Human-readable labels for each log level.
 */
export const LogLevelLabels: Record<LogLevel, string> = {
  [LogLevel.TRACE]: 'TRACE',
  [LogLevel.DEBUG]: 'DEBUG',
  [LogLevel.INFO]: 'INFO',
  [LogLevel.WARN]: 'WARN',
  [LogLevel.ERROR]: 'ERROR',
  [LogLevel.FATAL]: 'FATAL',
  [LogLevel.OFF]: 'OFF',
}

/**
 * Domain/origin of the log entry.
 * Helps identify where the log originates from for better traceability.
 */
export enum LogDomain {
  /**
   * Internal framework logs (OpenCore internals).
   * Used for core errors, bootstrap messages, decorator processing, etc.
   */
  FRAMEWORK = 'framework',

  /**
   * Server-side application logs.
   * Used by resource developers for their server logic.
   */
  SERVER = 'server',

  /**
   * Client-side application logs.
   * Used by resource developers for their client logic.
   */
  CLIENT = 'client',

  /**
   * External service logs.
   * Used for third-party APIs, databases, HTTP requests, etc.
   */
  EXTERNAL = 'external',
}

/**
 * Human-readable labels for each log domain.
 */
export const LogDomainLabels: Record<LogDomain, string> = {
  [LogDomain.FRAMEWORK]: 'CORE',
  [LogDomain.SERVER]: 'SERVER',
  [LogDomain.CLIENT]: 'CLIENT',
  [LogDomain.EXTERNAL]: 'EXTERNAL',
}

declare const __OPENCORE_RESOURCE_NAME__: string | undefined

function normalizeResourceName(resourceName: string): string {
  return resourceName.trim().replace(/^\[(.*)\]$/, '$1')
}

function getInjectedResourceName(): string | undefined {
  if (
    typeof __OPENCORE_RESOURCE_NAME__ === 'string' &&
    normalizeResourceName(__OPENCORE_RESOURCE_NAME__).length > 0
  ) {
    return normalizeResourceName(__OPENCORE_RESOURCE_NAME__)
  }

  const fn = (globalThis as { GetCurrentResourceName?: unknown }).GetCurrentResourceName
  if (typeof fn === 'function') {
    try {
      const value = fn()
      if (typeof value === 'string' && normalizeResourceName(value).length > 0) {
        return normalizeResourceName(value)
      }
    } catch {
      // Ignore runtime lookup failures and fall back to default labels.
    }
  }

  return undefined
}

export function getLogDomainLabel(domain: LogDomain): string {
  if (domain !== LogDomain.FRAMEWORK) {
    return LogDomainLabels[domain]
  }

  const resourceName = getInjectedResourceName()
  if (!resourceName) {
    return LogDomainLabels[domain]
  }

  if (resourceName.toLowerCase() === 'core') {
    return 'CORE'
  }

  return resourceName.toUpperCase()
}

/**
 * Additional contextual information that can be attached to any log entry.
 * Useful for tracing, debugging, and correlation.
 */
export interface LogContext {
  /** Domain/origin of the log (framework, server, client, external) */
  domain?: LogDomain
  /** Source module, controller or service name */
  source?: string
  /** Unique identifier for tracing related operations */
  traceId?: string
  /** Player ID if the log is related to a player action */
  playerId?: number
  /** Any additional metadata */
  [key: string]: unknown
}

/**
 * Represents a single log entry with all its metadata.
 * This is what gets passed to transports for processing.
 */
export interface LogEntry {
  /** Severity level of this log */
  level: LogLevel
  /** Domain/origin of the log */
  domain: LogDomain
  /** The main log message */
  message: string
  /** ISO 8601 timestamp when the log was created */
  timestamp: string
  /** Optional contextual data */
  context?: LogContext
  /** Optional error object if logging an error */
  error?: Error
}

/**
 * Configuration for parsing log level from string (useful for env vars).
 */
export function parseLogLevel(value: string): LogLevel {
  const upper = value.toUpperCase()
  const level = LogLevel[upper as keyof typeof LogLevel]
  return level !== undefined ? level : LogLevel.INFO
}
