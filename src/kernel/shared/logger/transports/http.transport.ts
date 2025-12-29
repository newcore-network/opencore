import * as http from 'node:http'
import { type LogEntry, LogLevel } from '../logger.types'
import type { LogTransport } from './transport.interface'

/**
 * Configuration for HTTP log transport.
 */
export interface HttpTransportOptions {
  /** HTTP endpoint URL (e.g., 'http://localhost:3847/logs') */
  url: string
  /** Request timeout in milliseconds */
  timeout?: number
  /** Batch size - number of logs to send per request */
  batchSize?: number
  /** Flush interval in milliseconds */
  flushInterval?: number
  /** Maximum buffer size */
  maxBufferSize?: number
}

/**
 * HTTP-based log transport for streaming logs to external tools.
 *
 * Compatible with FiveM's Node.js runtime. Uses batched HTTP POST requests
 * instead of WebSocket for environments where WebSocket is unavailable.
 *
 * @example
 * ```typescript
 * const transport = new HttpLogTransport({
 *   url: 'http://localhost:3847/logs',
 *   batchSize: 10,
 *   flushInterval: 1000,
 * })
 * transport.start()
 * ```
 */
export class HttpLogTransport implements LogTransport {
  readonly name = 'http'
  minLevel: LogLevel

  private buffer: LogEntry[] = []
  private options: Required<HttpTransportOptions>
  private flushTimer: ReturnType<typeof setInterval> | null = null
  private isSending = false
  private parsedUrl: URL

  constructor(options: HttpTransportOptions, minLevel: LogLevel = LogLevel.DEBUG) {
    this.minLevel = minLevel
    this.options = {
      url: options.url,
      timeout: options.timeout ?? 5000,
      batchSize: options.batchSize ?? 20,
      flushInterval: options.flushInterval ?? 500,
      maxBufferSize: options.maxBufferSize ?? 500,
    }
    this.parsedUrl = new URL(this.options.url)
  }

  /**
   * Starts the flush timer for periodic log sending.
   */
  start(): void {
    if (this.flushTimer) return

    this.flushTimer = setInterval(() => {
      void this.flush()
    }, this.options.flushInterval)
  }

  /**
   * Stops the transport and flushes remaining logs.
   */
  async stop(): Promise<void> {
    if (this.flushTimer) {
      clearInterval(this.flushTimer)
      this.flushTimer = null
    }
    await this.flush()
  }

  /**
   * Writes a log entry to the buffer.
   */
  write(entry: LogEntry): void {
    this.buffer.push(entry)

    // Prevent buffer overflow
    if (this.buffer.length > this.options.maxBufferSize) {
      this.buffer.shift()
    }

    // Flush immediately if batch size reached
    if (this.buffer.length >= this.options.batchSize) {
      void this.flush()
    }
  }

  /**
   * Flushes buffered logs to the server.
   */
  async flush(): Promise<void> {
    if (this.isSending || this.buffer.length === 0) return

    this.isSending = true
    const logsToSend = this.buffer.splice(0, this.options.batchSize)

    try {
      await this.sendLogs(logsToSend)
    } catch {
      // On error, put logs back at the front of the buffer
      this.buffer.unshift(...logsToSend)
      // But limit buffer size
      if (this.buffer.length > this.options.maxBufferSize) {
        this.buffer.length = this.options.maxBufferSize
      }
    } finally {
      this.isSending = false
    }
  }

  /**
   * Sends logs via HTTP POST.
   */
  private sendLogs(logs: LogEntry[]): Promise<void> {
    return new Promise((resolve, reject) => {
      const payload = JSON.stringify({
        type: 'logs',
        payload: logs.map((entry) => ({
          level: entry.level,
          domain: entry.domain,
          message: entry.message,
          timestamp: entry.timestamp,
          context: entry.context,
          error: entry.error
            ? {
                name: entry.error.name,
                message: entry.error.message,
                stack: entry.error.stack,
              }
            : undefined,
        })),
      })

      const options: http.RequestOptions = {
        hostname: this.parsedUrl.hostname,
        port: this.parsedUrl.port || 80,
        path: this.parsedUrl.pathname,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(payload),
        },
        timeout: this.options.timeout,
      }

      const req = http.request(options, (res) => {
        // Consume response to free up memory
        res.resume()

        if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
          resolve()
        } else {
          reject(new Error(`HTTP ${res.statusCode}`))
        }
      })

      req.on('error', reject)
      req.on('timeout', () => {
        req.destroy()
        reject(new Error('Request timeout'))
      })

      req.write(payload)
      req.end()
    })
  }

  /**
   * Destroys the transport and clears resources.
   */
  destroy(): void {
    if (this.flushTimer) {
      clearInterval(this.flushTimer)
      this.flushTimer = null
    }
    this.buffer = []
  }
}
