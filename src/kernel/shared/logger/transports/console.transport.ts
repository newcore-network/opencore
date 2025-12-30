import {
  LogDomain,
  LogDomainLabels,
  type LogEntry,
  LogLevel,
  LogLevelLabels,
} from '../logger.types'
import { LogTransport } from './transport.interface'

/**
 * Color codes for console output.
 * Uses ANSI escape codes compatible with most terminals.
 */
const COLORS = {
  reset: '\x1b[0m',
  dim: '\x1b[2m',
  bold: '\x1b[1m',
  cyan: '\x1b[36m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  magenta: '\x1b[35m',
  white: '\x1b[37m',
  blue: '\x1b[34m',
  bgRed: '\x1b[41m',
  bgYellow: '\x1b[43m',
  bgBlue: '\x1b[44m',
  bgMagenta: '\x1b[45m',
} as const

const LEVEL_COLORS: Record<LogLevel, string> = {
  [LogLevel.TRACE]: COLORS.dim,
  [LogLevel.DEBUG]: COLORS.cyan,
  [LogLevel.INFO]: COLORS.green,
  [LogLevel.WARN]: COLORS.yellow,
  [LogLevel.ERROR]: COLORS.red,
  [LogLevel.FATAL]: COLORS.magenta,
  [LogLevel.OFF]: COLORS.white,
}

/**
 * Domain colors - distinctive to quickly identify log origin.
 */
const DOMAIN_COLORS: Record<LogDomain, string> = {
  [LogDomain.FRAMEWORK]: COLORS.magenta,
  [LogDomain.SERVER]: COLORS.blue,
  [LogDomain.CLIENT]: COLORS.cyan,
  [LogDomain.EXTERNAL]: COLORS.yellow,
}

export interface ConsoleTransportOptions {
  /**
   * Minimum log level to output. Defaults to DEBUG.
   */
  minLevel?: LogLevel

  /**
   * Whether to use colors in output. Defaults to true.
   */
  colors?: boolean

  /**
   * Whether to include timestamp in output. Defaults to true.
   */
  timestamps?: boolean
}

/**
 * Default transport that outputs logs to the console.
 * Supports colored output and configurable formatting.
 *
 * @example
 * ```typescript
 * const transport = new ConsoleTransport({
 *   minLevel: LogLevel.DEBUG,
 *   colors: true,
 *   timestamps: true
 * })
 * ```
 */
export class ConsoleTransport implements LogTransport {
  readonly name = 'console'
  minLevel: LogLevel

  private colors: boolean
  private timestamps: boolean

  constructor(options: ConsoleTransportOptions = {}) {
    this.minLevel = options.minLevel ?? LogLevel.DEBUG
    this.colors = options.colors ?? true
    this.timestamps = options.timestamps ?? true
  }

  write(entry: LogEntry): void {
    const { level, domain, message, timestamp, context, error } = entry

    const levelLabel = LogLevelLabels[level].padEnd(5)
    const domainLabel = LogDomainLabels[domain]
    const levelColor = this.colors ? LEVEL_COLORS[level] : ''
    const domainColor = this.colors ? DOMAIN_COLORS[domain] : ''
    const reset = this.colors ? COLORS.reset : ''
    const dim = this.colors ? COLORS.dim : ''
    const bold = this.colors ? COLORS.bold : ''

    // Build the log line
    const parts: string[] = []

    if (this.timestamps) {
      const time = timestamp.split('T')[1]?.slice(0, 12) ?? timestamp
      parts.push(`${dim}[${time}]${reset}`)
    }

    // Domain tag - always shown for context
    parts.push(`${domainColor}${bold}[${domainLabel}]${reset}`)

    // Level
    parts.push(`${levelColor}${levelLabel}${reset}`)

    // Source module/controller
    if (context?.source) {
      parts.push(`${dim}[${context.source}]${reset}`)
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

    // Output context if present (excluding source and domain which are already shown)
    if (context) {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { source, domain: _, ...rest } = context
      if (Object.keys(rest).length > 0) {
        console.debug(`${dim}  └─ context:${reset}`, rest)
      }
    }

    // Output error stack if present
    if (error?.stack) {
      console.error(`${dim}  └─ stack:${reset}`, error.stack)
    }
  }
}
