import { LogDomainLabels, type LogEntry, LogLevel, LogLevelLabels } from '../logger.types'
import type { LogTransport } from './transport.interface'

export interface SimpleConsoleTransportOptions {
  /**
   * Minimum log level to output. Defaults to INFO.
   */
  minLevel?: LogLevel

  /**
   * Whether to include timestamp in output. Defaults to true.
   */
  timestamps?: boolean

  /**
   * Whether to show context data. Defaults to false for cleaner output.
   */
  showContext?: boolean
}

/**
 * Simple console transport without ANSI color codes.
 * Designed for FiveM client console which doesn't support ANSI formatting.
 *
 * Output format: [HH:MM:SS.mmm] [DOMAIN] LEVEL [Source] Message
 *
 * @example
 * ```typescript
 * const transport = new SimpleConsoleTransport({
 *   minLevel: LogLevel.INFO,
 *   timestamps: true
 * })
 * ```
 */
export class SimpleConsoleTransport implements LogTransport {
  readonly name = 'simple-console'
  minLevel: LogLevel

  private timestamps: boolean
  private showContext: boolean

  constructor(options: SimpleConsoleTransportOptions = {}) {
    this.minLevel = options.minLevel ?? LogLevel.INFO
    this.timestamps = options.timestamps ?? true
    this.showContext = options.showContext ?? false
  }

  write(entry: LogEntry): void {
    const { level, domain, message, timestamp, context, error } = entry

    const levelLabel = LogLevelLabels[level].padEnd(5)
    const domainLabel = LogDomainLabels[domain]

    // Build the log line without ANSI codes
    const parts: string[] = []

    if (this.timestamps) {
      const time = timestamp.split('T')[1]?.slice(0, 12) ?? timestamp
      parts.push(`[${time}]`)
    }

    // Domain tag
    parts.push(`[${domainLabel}]`)

    // Level
    parts.push(levelLabel)

    // Source module/controller
    if (context?.source) {
      parts.push(`[${context.source}]`)
    }

    parts.push(message)

    // Output the main log line
    const logLine = parts.join(' ')

    // Choose the appropriate console method
    switch (level) {
      case LogLevel.TRACE:
      case LogLevel.DEBUG:
        console.debug(logLine)
        break
      case LogLevel.INFO:
        console.info(logLine)
        break
      case LogLevel.WARN:
        console.warn(logLine)
        break
      case LogLevel.ERROR:
      case LogLevel.FATAL:
        console.error(logLine)
        break
      default:
        console.log(logLine)
    }

    // Output context only if enabled and present
    if (this.showContext && context) {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { source, domain: _, ...rest } = context
      if (Object.keys(rest).length > 0) {
        console.debug('  context:', JSON.stringify(rest))
      }
    }

    // Output error stack if present
    if (error?.stack) {
      console.error('  stack:', error.stack)
    }
  }
}
