import { LogLevel } from '../logger.types'
import { HttpLogTransport, type HttpTransportOptions } from './http.transport'
import { LogTransport } from './transport.interface'
import { WebSocketLogTransport, type WebSocketTransportOptions } from './websocket.transport'

/**
 * Runtime environment detection.
 */
export type RuntimeEnvironment = 'cfx' | 'node'

/**
 * Options for creating a dev transport.
 */
export interface DevTransportOptions {
  /** HTTP endpoint URL for Cfx mode */
  httpUrl: string
  /** WebSocket URL for Node.js mode */
  wsUrl?: string
  /** Force a specific transport type */
  forceTransport?: 'http' | 'websocket'
  /** Minimum log level */
  minLevel?: LogLevel
  /** HTTP transport specific options */
  httpOptions?: Partial<Omit<HttpTransportOptions, 'url'>>
  /** WebSocket transport specific options */
  wsOptions?: Partial<Omit<WebSocketTransportOptions, 'url'>>
}

/**
 * Detects the current runtime environment.
 *
 * @returns 'cfx' if running in CitizenFX, 'node' otherwise
 */
export function detectEnvironment(): RuntimeEnvironment {
  // Check for CitizenFX globals
  if (typeof GetCurrentResourceName === 'function') {
    return 'cfx'
  }
  return 'node'
}

/**
 * Checks if WebSocket is available in the current environment.
 */
export function isWebSocketAvailable(): boolean {
  return typeof WebSocket !== 'undefined'
}

/**
 * Creates the appropriate log transport based on the runtime environment.
 *
 * - In Cfx: Uses HttpLogTransport (Node.js http module)
 * - In Node.js: Uses WebSocketLogTransport if available, otherwise HttpLogTransport
 *
 * @param options - Transport configuration
 * @returns Configured log transport
 *
 * @example
 * ```typescript
 * const transport = createDevTransport({
 *   httpUrl: 'http://localhost:3847/logs',
 *   wsUrl: 'ws://localhost:3848',
 * })
 *
 * if ('start' in transport) {
 *   transport.start() // HTTP transport
 * } else if ('connect' in transport) {
 *   await transport.connect() // WebSocket transport
 * }
 * ```
 */
export function createDevTransport(options: DevTransportOptions): LogTransport {
  const env = detectEnvironment()
  const minLevel = options.minLevel ?? LogLevel.DEBUG

  // If forced transport type is specified, use it
  if (options.forceTransport === 'http') {
    return new HttpLogTransport({ url: options.httpUrl, ...options.httpOptions }, minLevel)
  }

  if (options.forceTransport === 'websocket') {
    const wsUrl = options.wsUrl ?? options.httpUrl.replace('http', 'ws')
    return new WebSocketLogTransport({ url: wsUrl, ...options.wsOptions }, minLevel)
  }

  // Auto-detect based on environment
  if (env === 'cfx') {
    // Cfx runtime: Always use HTTP (WebSocket not available in game runtime)
    return new HttpLogTransport({ url: options.httpUrl, ...options.httpOptions }, minLevel)
  }

  // Node.js: Prefer WebSocket if available, otherwise use HTTP
  if (isWebSocketAvailable() && options.wsUrl) {
    return new WebSocketLogTransport({ url: options.wsUrl, ...options.wsOptions }, minLevel)
  }

  // Fallback to HTTP
  return new HttpLogTransport({ url: options.httpUrl, ...options.httpOptions }, minLevel)
}

/**
 * Type guard to check if transport is HttpLogTransport.
 */
export function isHttpTransport(transport: LogTransport): transport is HttpLogTransport {
  return transport.name === 'http'
}

/**
 * Type guard to check if transport is WebSocketLogTransport.
 */
export function isWebSocketTransport(transport: LogTransport): transport is WebSocketLogTransport {
  return transport.name === 'websocket'
}

/**
 * Starts the transport (handles both HTTP and WebSocket).
 */
export async function startDevTransport(transport: LogTransport): Promise<void> {
  if (isHttpTransport(transport)) {
    transport.start()
  } else if (isWebSocketTransport(transport)) {
    await transport.connect()
  }
}

/**
 * Stops the transport (handles both HTTP and WebSocket).
 */
export async function stopDevTransport(transport: LogTransport): Promise<void> {
  if (isHttpTransport(transport)) {
    await transport.stop()
  } else if (isWebSocketTransport(transport)) {
    transport.destroy()
  }
}
