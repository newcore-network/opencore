import { type LogEntry, LogLevel } from '../logger.types'
import { LogTransport } from './transport.interface'

/**
 * Configuration for WebSocket log transport.
 */
export interface WebSocketTransportOptions {
  /** WebSocket server URL */
  url: string
  /** Auto-reconnect on disconnect */
  reconnect?: boolean
  /** Reconnect interval in milliseconds */
  reconnectInterval?: number
  /** Maximum buffer size when disconnected */
  bufferSize?: number
}

/**
 * WebSocket-based log transport for streaming logs to external tools.
 *
 * Used during development to stream logs to the CLI or other monitoring tools.
 * Buffers messages when disconnected and flushes on reconnection.
 *
 * @example
 * ```typescript
 * const transport = new WebSocketLogTransport({
 *   url: 'ws://localhost:3848',
 *   reconnect: true,
 * })
 * await transport.connect()
 * logger.addTransport(transport)
 * ```
 */
export class WebSocketLogTransport implements LogTransport {
  readonly name = 'websocket'
  minLevel: LogLevel

  private ws: WebSocket | null = null
  private buffer: LogEntry[] = []
  private options: Required<WebSocketTransportOptions>
  private connected = false
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null
  private messageHandlers: Array<(data: unknown) => void> = []

  constructor(options: WebSocketTransportOptions, minLevel: LogLevel = LogLevel.DEBUG) {
    this.minLevel = minLevel
    this.options = {
      url: options.url,
      reconnect: options.reconnect ?? true,
      reconnectInterval: options.reconnectInterval ?? 5000,
      bufferSize: options.bufferSize ?? 100,
    }
  }

  /**
   * Connects to the WebSocket server.
   */
  async connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        this.ws = new WebSocket(this.options.url)

        this.ws.onopen = () => {
          this.connected = true
          this.flushBuffer()
          resolve()
        }

        this.ws.onclose = () => {
          this.connected = false
          this.ws = null
          if (this.options.reconnect) {
            this.scheduleReconnect()
          }
        }

        this.ws.onerror = (error) => {
          if (!this.connected) {
            reject(error)
          }
        }

        this.ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data as string)
            for (const handler of this.messageHandlers) {
              handler(data)
            }
          } catch {
            // Ignore parse errors
          }
        }
      } catch (error) {
        reject(error)
      }
    })
  }

  /**
   * Writes a log entry to the WebSocket or buffer.
   */
  write(entry: LogEntry): void {
    const message = {
      type: 'log',
      payload: {
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
      },
    }

    if (this.connected && this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message))
    } else {
      this.bufferEntry(entry)
    }
  }

  /**
   * Sends a raw message through the WebSocket.
   */
  send(message: unknown): void {
    if (this.connected && this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message))
    }
  }

  /**
   * Registers a handler for incoming messages.
   */
  onMessage(handler: (data: unknown) => void): void {
    this.messageHandlers.push(handler)
  }

  /**
   * Checks if currently connected.
   */
  isConnected(): boolean {
    return this.connected
  }

  /**
   * Disconnects and cleans up resources.
   */
  destroy(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer)
      this.reconnectTimer = null
    }

    if (this.ws) {
      this.ws.onclose = null
      this.ws.close()
      this.ws = null
    }

    this.connected = false
    this.buffer = []
    this.messageHandlers = []
  }

  private bufferEntry(entry: LogEntry): void {
    this.buffer.push(entry)
    if (this.buffer.length > this.options.bufferSize) {
      this.buffer.shift()
    }
  }

  private flushBuffer(): void {
    for (const entry of this.buffer) {
      this.write(entry)
    }
    this.buffer = []
  }

  private scheduleReconnect(): void {
    if (this.reconnectTimer) return

    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null
      this.connect().catch(() => {
        // Will retry via onclose handler
      })
    }, this.options.reconnectInterval)
  }
}
