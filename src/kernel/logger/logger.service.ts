import { inject, injectable } from 'tsyringe'
import { createLoggerConfig, type LoggerConfig } from './logger.config'
import { type LogContext, LogDomain, type LogEntry, LogLevel } from './logger.types'
import { LogTransport } from './transports/transport.interface'

/**
 * Central logging service for the framework.
 *
 * Provides structured logging with support for multiple transports,
 * log levels, and contextual metadata for traceability.
 *
 * @example
 * ```typescript
 * // Using with dependency injection
 * @injectable()
 * class MyController {
 *   constructor(private logger: LoggerService) {}
 *
 *   doSomething() {
 *     this.logger.info('Operation started', { source: 'MyController' })
 *     this.logger.debug('Processing data', { playerId: 123 })
 *   }
 * }
 * ```
 *
 * @example
 * ```typescript
 * // Manual instantiation with custom config
 * const logger = new LoggerService({
 *   minLevel: LogLevel.INFO,
 *   transports: [new ConsoleTransport(), new FileTransport()]
 * })
 * ```
 */
@injectable()
export class LoggerService {
  private config: LoggerConfig

  constructor(@inject('LoggerConfig') config?: Partial<LoggerConfig>) {
    this.config = createLoggerConfig(config ?? {})
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Log Methods
  // ─────────────────────────────────────────────────────────────────────────────

  /**
   * Log a TRACE level message. Most verbose, for deep debugging.
   */
  trace(message: string, context?: LogContext): void {
    this.log(LogLevel.TRACE, message, context)
  }

  /**
   * Log a DEBUG level message. Development-time information.
   */
  debug(message: string, context?: LogContext): void {
    this.log(LogLevel.DEBUG, message, context)
  }

  /**
   * Log an INFO level message. General operational information.
   */
  info(message: string, context?: LogContext): void {
    this.log(LogLevel.INFO, message, context)
  }

  /**
   * Log a WARN level message. Something unexpected but not necessarily wrong.
   */
  warn(message: string, context?: LogContext): void {
    this.log(LogLevel.WARN, message, context)
  }

  /**
   * Log an ERROR level message. Something went wrong but the app can continue.
   */
  error(message: string, context?: LogContext, error?: Error): void {
    this.log(LogLevel.ERROR, message, context, error)
  }

  /**
   * Log a FATAL level message. Critical error, the app may need to stop.
   */
  fatal(message: string, context?: LogContext, error?: Error): void {
    this.log(LogLevel.FATAL, message, context, error)
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Transport Management
  // ─────────────────────────────────────────────────────────────────────────────

  /**
   * Add a new transport to receive log entries.
   *
   * @example
   * ```typescript
   * logger.addTransport(new FileTransport({ path: './logs/app.log' }))
   * ```
   */
  addTransport(transport: LogTransport): void {
    this.config.transports.push(transport)
  }

  /**
   * Remove a transport by name.
   */
  removeTransport(name: string): boolean {
    const index = this.config.transports.findIndex((t) => t.name === name)
    if (index === -1) return false

    const [removed] = this.config.transports.splice(index, 1)
    removed?.destroy?.()
    return true
  }

  /**
   * Get all registered transports.
   */
  getTransports(): readonly LogTransport[] {
    return this.config.transports
  }

  /**
   * Clear all transports.
   */
  clearTransports(): void {
    for (const transport of this.config.transports) {
      transport.destroy?.()
    }
    this.config.transports = []
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Configuration
  // ─────────────────────────────────────────────────────────────────────────────

  /**
   * Update the global minimum log level.
   */
  setMinLevel(level: LogLevel): void {
    this.config.minLevel = level
  }

  /**
   * Get the current minimum log level.
   */
  getMinLevel(): LogLevel {
    return this.config.minLevel
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Domain-specific Loggers
  // ─────────────────────────────────────────────────────────────────────────────

  /**
   * Create a server-level logger for server-side application code.
   * These logs will be tagged with [SERVER] domain.
   *
   * @example
   * ```typescript
   * const authLogger = logger.server('AuthController')
   * authLogger.info('User logged in') // [SERVER] INFO [AuthController] User logged in
   * ```
   */
  server(source: string): ChildLogger {
    return new ChildLogger(this, source, LogDomain.SERVER)
  }

  /**
   * Create a framework-level logger for internal OpenCore logging.
   * These logs will be tagged with [CORE] domain.
   *
   * @example
   * ```typescript
   * const coreLogger = logger.framework('Bootstrap')
   * coreLogger.error('Missing config') // [CORE] ERROR [Bootstrap] Missing config
   * ```
   */
  framework(source: string): ChildLogger {
    return new ChildLogger(this, source, LogDomain.FRAMEWORK)
  }

  /**
   * Create a client-level logger for client-side code.
   * These logs will be tagged with [CLIENT] domain.
   *
   * @example
   * ```typescript
   * const hudLogger = logger.client('HUD')
   * hudLogger.debug('Rendering') // [CLIENT] DEBUG [HUD] Rendering
   * ```
   */
  client(source: string): ChildLogger {
    return new ChildLogger(this, source, LogDomain.CLIENT)
  }

  /**
   * Create an external services logger for third-party APIs, databases, etc.
   * These logs will be tagged with [EXTERNAL] domain.
   *
   * @example
   * ```typescript
   * const stripeLogger = logger.external('StripeAPI')
   * stripeLogger.warn('Rate limit') // [EXTERNAL] WARN [StripeAPI] Rate limit
   * ```
   */
  external(source: string): ChildLogger {
    return new ChildLogger(this, source, LogDomain.EXTERNAL)
  }

  /**
   * Create a child logger with custom domain.
   * Use this when you need a specific domain not covered by the convenience methods.
   *
   * @example
   * ```typescript
   * const customLogger = logger.child('MyModule', LogDomain.EXTERNAL)
   * ```
   */
  child(source: string, domain?: LogDomain): ChildLogger {
    return new ChildLogger(this, source, domain)
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Internal
  // ─────────────────────────────────────────────────────────────────────────────

  /**
   * Internal logging logic.
   *
   * @remarks
   * This method performs a two-stage filtering process:
   * 1. **Global Filtering**: Messages below the `config.minLevel` are ignored immediately.
   * 2. **Transport Filtering**: Each transport can have its own `minLevel`. The message
   *    is only sent to transports where `level >= transport.minLevel`.
   *
   * @param level - Severity of the log
   * @param message - Content to log
   * @param context - Metadata
   * @param error - Optional error object
   */
  private log(level: LogLevel, message: string, context?: LogContext, error?: Error): void {
    // Stage 1: Global minimum level filtering
    if (level < this.config.minLevel) return

    const entry: LogEntry = {
      level,
      domain: context?.domain ?? this.config.defaultDomain,
      message,
      timestamp: new Date().toISOString(),
      context: {
        source: context?.source ?? this.config.defaultSource,
        ...context,
      },
      error,
    }

    // Stage 2: Individual transport level filtering
    for (const transport of this.config.transports) {
      if (level >= transport.minLevel) {
        try {
          transport.write(entry)
        } catch (err) {
          // Avoid infinite loops - just console.error transport failures
          console.error(`[Logger] Transport "${transport.name}" failed:`, err)
        }
      }
    }
  }
}

/**
 * A lightweight logger wrapper with a preset source and domain context.
 * Created via LoggerService.child(), .framework(), .client(), or .external()
 */
export class ChildLogger {
  constructor(
    private parent: LoggerService,
    private source: string,
    private domain?: LogDomain,
  ) {}

  private buildContext(context?: Omit<LogContext, 'source' | 'domain'>): LogContext {
    return {
      ...context,
      source: this.source,
      ...(this.domain && { domain: this.domain }),
    }
  }

  trace(message: string, context?: Omit<LogContext, 'source' | 'domain'>): void {
    this.parent.trace(message, this.buildContext(context))
  }

  debug(message: string, context?: Omit<LogContext, 'source' | 'domain'>): void {
    this.parent.debug(message, this.buildContext(context))
  }

  info(message: string, context?: Omit<LogContext, 'source' | 'domain'>): void {
    this.parent.info(message, this.buildContext(context))
  }

  warn(message: string, context?: Omit<LogContext, 'source' | 'domain'>): void {
    this.parent.warn(message, this.buildContext(context))
  }

  error(message: string, context?: Omit<LogContext, 'source' | 'domain'>, error?: Error): void {
    this.parent.error(message, this.buildContext(context), error)
  }

  fatal(message: string, context?: Omit<LogContext, 'source' | 'domain'>, error?: Error): void {
    this.parent.fatal(message, this.buildContext(context), error)
  }
}
