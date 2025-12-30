import { loggers } from '../../../kernel/shared/logger'
import { HotReloadOptions } from './types'

// Lazy-loaded http module (only loaded at runtime, not bundled)
let httpModule: any = null

// Use variable to prevent esbuild from statically analyzing the require
const HTTP_MODULE = 'http'

function getHttpSync() {
  if (!httpModule) {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    httpModule = require(HTTP_MODULE)
  }
  return httpModule
}

// Safe wrappers for FiveM globals (no-op in Node.js)
function safeGetCurrentResourceName(): string {
  if (typeof GetCurrentResourceName === 'function') {
    return GetCurrentResourceName()
  }
  return 'unknown'
}

function safeExecuteCommand(command: string): void {
  if (typeof ExecuteCommand === 'function') {
    ExecuteCommand(command)
  } else {
    loggers.bootstrap.warn('[DevMode] ExecuteCommand not available (not running in FiveM)')
  }
}

/**
 * Log message structure for HTTP transport.
 */
export interface LogMessage {
  level: number
  domain: string
  message: string
  timestamp: number
  context?: Record<string, unknown>
  error?: {
    name: string
    message: string
    stack?: string
  }
}

/**
 * HTTP server for handling hot reload requests from the CLI.
 *
 * Provides an endpoint that the CLI can call to restart resources
 * after file changes are detected.
 *
 * @example
 * ```typescript
 * const server = new HotReloadServer({ enabled: true, port: 3847 })
 * server.start()
 * // CLI calls POST /restart?resource=my-resource
 * ```
 */
export class HotReloadServer {
  private server: any = null
  private options: HotReloadOptions
  private logBuffer: LogMessage[] = []
  private maxLogBuffer = 1000
  private logListeners: Array<(logs: LogMessage[]) => void> = []

  constructor(options: HotReloadOptions) {
    this.options = options
  }

  /**
   * Adds logs to the buffer (called by HttpLogTransport).
   */
  addLogs(logs: LogMessage[]): void {
    this.logBuffer.push(...logs)
    if (this.logBuffer.length > this.maxLogBuffer) {
      this.logBuffer = this.logBuffer.slice(-this.maxLogBuffer)
    }
    // Notify listeners
    for (const listener of this.logListeners) {
      listener(logs)
    }
  }

  /**
   * Gets and clears buffered logs.
   */
  consumeLogs(): LogMessage[] {
    const logs = this.logBuffer
    this.logBuffer = []
    return logs
  }

  /**
   * Adds a listener for new logs.
   */
  onLogs(listener: (logs: LogMessage[]) => void): () => void {
    this.logListeners.push(listener)
    return () => {
      const idx = this.logListeners.indexOf(listener)
      if (idx !== -1) this.logListeners.splice(idx, 1)
    }
  }

  /**
   * Starts the hot reload HTTP server.
   */
  start(): void {
    if (!this.options.enabled) return
    if (this.server) return

    const http = getHttpSync()
    this.server = http.createServer((req: any, res: any) => {
      this.handleRequest(req, res)
    })

    this.server.listen(this.options.port, '127.0.0.1', () => {
      loggers.bootstrap.info(`[DevMode] Hot reload server listening on port ${this.options.port}`)
    })

    this.server.on('error', (error: Error) => {
      loggers.bootstrap.error(`[DevMode] Hot reload server error`, {}, error as Error)
    })
  }

  /**
   * Stops the hot reload server.
   */
  stop(): void {
    if (this.server) {
      this.server.close()
      this.server = null
      loggers.bootstrap.info('[DevMode] Hot reload server stopped')
    }
  }

  /**
   * Checks if the server is running.
   */
  isRunning(): boolean {
    return this.server !== null
  }

  private handleRequest(req: any, res: any): void {
    // CORS headers for CLI access
    res.setHeader('Access-Control-Allow-Origin', '*')
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

    if (req.method === 'OPTIONS') {
      res.writeHead(204)
      res.end()
      return
    }

    if (req.method === 'POST' && req.url?.startsWith('/restart')) {
      this.handleRestart(req, res)
      return
    }

    if (req.method === 'POST' && req.url?.startsWith('/refresh')) {
      this.handleRefresh(res)
      return
    }

    if (req.method === 'GET' && req.url === '/health') {
      this.handleHealth(res)
      return
    }

    // Log endpoints for CLI polling
    if (req.method === 'GET' && req.url === '/logs') {
      this.handleGetLogs(res)
      return
    }

    if (req.method === 'POST' && req.url === '/logs') {
      this.handlePostLogs(req, res)
      return
    }

    res.writeHead(404, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify({ error: 'Not found' }))
  }

  private handleRestart(req: any, res: any): void {
    try {
      const url = new URL(req.url ?? '', `http://localhost:${this.options.port}`)
      const resource = url.searchParams.get('resource')

      if (!resource) {
        res.writeHead(400, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify({ error: 'Missing resource parameter' }))
        return
      }

      if (!this.isResourceAllowed(resource)) {
        res.writeHead(403, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify({ error: 'Resource not allowed for hot reload' }))
        return
      }

      // Don't restart ourselves
      const currentResource = safeGetCurrentResourceName()
      if (resource === currentResource) {
        res.writeHead(400, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify({ error: 'Cannot restart the hot-reload resource itself' }))
        return
      }

      loggers.bootstrap.info(`[DevMode] Hot reloading resource: ${resource}`)

      // Execute the restart command
      safeExecuteCommand(`restart ${resource}`)

      res.writeHead(200, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify({ success: true, resource }))
    } catch (error) {
      loggers.bootstrap.error('[DevMode] Hot reload error', {}, error as Error)
      res.writeHead(500, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify({ error: 'Internal server error' }))
    }
  }

  private handleRefresh(res: any): void {
    try {
      loggers.bootstrap.info('[DevMode] Refreshing resources')
      safeExecuteCommand('refresh')

      res.writeHead(200, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify({ success: true }))
    } catch (error) {
      loggers.bootstrap.error('[DevMode] Refresh error', {}, error as Error)
      res.writeHead(500, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify({ error: 'Internal server error' }))
    }
  }

  private handleHealth(res: any): void {
    res.writeHead(200, { 'Content-Type': 'application/json' })
    res.end(
      JSON.stringify({
        status: 'ok',
        resource: safeGetCurrentResourceName(),
        timestamp: Date.now(),
      }),
    )
  }

  private isResourceAllowed(resource: string): boolean {
    if (!this.options.allowedResources || this.options.allowedResources.length === 0) {
      return true
    }
    return this.options.allowedResources.includes(resource)
  }

  /**
   * Handles GET /logs - CLI polls for buffered logs.
   */
  private handleGetLogs(res: any): void {
    const logs = this.consumeLogs()
    res.writeHead(200, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify({ logs, timestamp: Date.now() }))
  }

  /**
   * Handles POST /logs - Framework pushes logs to buffer.
   */
  private handlePostLogs(req: any, res: any): void {
    let body = ''

    req.on('data', (chunk: any) => {
      body += chunk.toString()
      // Limit body size to 1MB
      if (body.length > 1024 * 1024) {
        res.writeHead(413, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify({ error: 'Payload too large' }))
        req.destroy()
      }
    })

    req.on('end', () => {
      try {
        const data = JSON.parse(body)
        if (data.type === 'logs' && Array.isArray(data.payload)) {
          this.addLogs(data.payload)
          res.writeHead(200, { 'Content-Type': 'application/json' })
          res.end(JSON.stringify({ success: true, received: data.payload.length }))
        } else {
          res.writeHead(400, { 'Content-Type': 'application/json' })
          res.end(JSON.stringify({ error: 'Invalid payload format' }))
        }
      } catch {
        res.writeHead(400, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify({ error: 'Invalid JSON' }))
      }
    })

    req.on('error', () => {
      res.writeHead(500, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify({ error: 'Request error' }))
    })
  }
}
