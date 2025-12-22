import { LogDomainLabels, LogLevel, LogLevelLabels, type LogEntry } from '../logger.types'
import type { LogTransport } from './transport.interface'

/**
 * Output format for exported logs.
 */
export type LogOutputFormat = 'json' | 'text' | 'csv'

export interface BufferedTransportOptions {
  /**
   * Minimum log level to buffer. Defaults to DEBUG.
   */
  minLevel?: LogLevel

  /**
   * Maximum number of entries to keep in buffer.
   * Older entries are removed when limit is reached (FIFO).
   * @default 1000
   */
  maxEntries?: number

  /**
   * Callback triggered when buffer reaches maxEntries.
   * Useful for auto-flushing to external storage.
   */
  onBufferFull?: (entries: LogEntry[]) => void
}

/**
 * A transport that buffers log entries in memory for later export.
 *
 * Use this when you need to:
 * - Export logs to a file via FiveM's SaveResourceFile
 * - Send logs to an external API in batches
 * - Display logs in a UI
 *
 * @example
 * ```typescript
 * const buffered = new BufferedTransport({
 *   minLevel: LogLevel.INFO,
 *   maxEntries: 500,
 *   onBufferFull: (entries) => {
 *     // Auto-save when buffer is full
 *     const content = buffered.export('text')
 *     SaveResourceFile(GetCurrentResourceName(), 'logs/app.log', content, -1)
 *     buffered.clear()
 *   }
 * })
 *
 * logger.addTransport(buffered)
 *
 * // Later, export manually
 * const jsonLogs = buffered.export('json')
 * const textLogs = buffered.export('text')
 * ```
 */
export class BufferedTransport implements LogTransport {
  readonly name = 'buffered'
  minLevel: LogLevel

  private buffer: LogEntry[] = []
  private maxEntries: number
  private onBufferFull?: (entries: LogEntry[]) => void

  constructor(options: BufferedTransportOptions = {}) {
    this.minLevel = options.minLevel ?? LogLevel.DEBUG
    this.maxEntries = options.maxEntries ?? 1000
    this.onBufferFull = options.onBufferFull
  }

  write(entry: LogEntry): void {
    this.buffer.push(entry)

    // Check buffer limit
    if (this.buffer.length >= this.maxEntries) {
      if (this.onBufferFull) {
        this.onBufferFull([...this.buffer])
      }
      // Remove oldest entries to make room
      this.buffer = this.buffer.slice(-Math.floor(this.maxEntries * 0.8))
    }
  }

  /**
   * Get all buffered entries.
   */
  getEntries(): readonly LogEntry[] {
    return this.buffer
  }

  /**
   * Get the current buffer size.
   */
  size(): number {
    return this.buffer.length
  }

  /**
   * Clear the buffer.
   */
  clear(): void {
    this.buffer = []
  }

  /**
   * Export buffered logs in the specified format.
   *
   * @param format - Output format: 'json', 'text', or 'csv'
   * @returns Formatted string ready for saving
   */
  export(format: LogOutputFormat = 'text'): string {
    switch (format) {
      case 'json':
        return this.exportJson()
      case 'csv':
        return this.exportCsv()
      case 'text':
      default:
        return this.exportText()
    }
  }

  /**
   * Export and clear buffer in one operation.
   */
  flush(format: LogOutputFormat = 'text'): string {
    const content = this.export(format)
    this.clear()
    return content
  }

  private exportJson(): string {
    const entries = this.buffer.map((entry) => ({
      timestamp: entry.timestamp,
      level: LogLevelLabels[entry.level],
      domain: LogDomainLabels[entry.domain],
      source: entry.context?.source,
      message: entry.message,
      context: this.cleanContext(entry.context),
      error: entry.error
        ? {
            name: entry.error.name,
            message: entry.error.message,
            stack: entry.error.stack,
          }
        : undefined,
    }))
    return JSON.stringify(entries, null, 2)
  }

  private exportText(): string {
    return this.buffer
      .map((entry) => {
        const time = entry.timestamp.replace('T', ' ').slice(0, 23)
        const level = LogLevelLabels[entry.level].padEnd(5)
        const domain = LogDomainLabels[entry.domain].padEnd(8)
        const source = entry.context?.source ? `[${entry.context.source}]` : ''

        let line = `${time} | ${domain} | ${level} | ${source} ${entry.message}`

        const ctx = this.cleanContext(entry.context)
        if (Object.keys(ctx).length > 0) {
          line += ` | ctx: ${JSON.stringify(ctx)}`
        }

        if (entry.error?.stack) {
          line += `\n    └─ ${entry.error.stack.replace(/\n/g, '\n    ')}`
        }

        return line
      })
      .join('\n')
  }

  private exportCsv(): string {
    const headers = ['timestamp', 'level', 'domain', 'source', 'message', 'context', 'error']
    const rows = this.buffer.map((entry) => [
      entry.timestamp,
      LogLevelLabels[entry.level],
      LogDomainLabels[entry.domain],
      entry.context?.source ?? '',
      `"${entry.message.replace(/"/g, '""')}"`,
      JSON.stringify(this.cleanContext(entry.context)),
      entry.error?.message ?? '',
    ])

    return [headers.join(','), ...rows.map((row) => row.join(','))].join('\n')
  }

  private cleanContext(context?: Record<string, unknown>): Record<string, unknown> {
    if (!context) return {}
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { source, domain, ...rest } = context
    return rest
  }

  destroy(): void {
    this.clear()
  }
}
