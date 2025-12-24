import type { LogEntry, LogLevel } from '../logger.types'

/**
 * Contract that all log transports must implement.
 *
 * A transport is responsible for delivering log entries to a specific destination
 * (console, file, database, external service, etc.).
 *
 * @example
 * ```typescript
 * class FileTransport implements LogTransport {
 *   name = 'file'
 *   minLevel = LogLevel.WARN
 *
 *   write(entry: LogEntry): void {
 *     fs.appendFileSync('app.log', JSON.stringify(entry) + '\n')
 *   }
 * }
 * ```
 */
export interface LogTransport {
  /**
   * Unique identifier for this transport.
   * Used for debugging and transport management.
   */
  readonly name: string

  /**
   * Minimum log level this transport will handle.
   * Entries below this level will be ignored by this transport.
   */
  minLevel: LogLevel

  /**
   * Process and deliver a log entry to its destination.
   * @param entry - The log entry to process
   */
  write(entry: LogEntry): void

  /**
   * Optional cleanup method called when the transport is removed or the logger is destroyed.
   */
  destroy?(): void
}
