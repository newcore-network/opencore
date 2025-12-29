import * as http from 'node:http'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  HotReloadServer,
  type LogMessage,
} from '../../../../src/runtime/server/devmode/hot-reload.server'

// Mock FiveM globals
vi.stubGlobal('GetCurrentResourceName', () => 'test-resource')
vi.stubGlobal('ExecuteCommand', vi.fn())

describe('HotReloadServer', () => {
  let server: HotReloadServer
  let httpServer: http.Server | null = null

  beforeEach(() => {
    vi.clearAllMocks()
    server = new HotReloadServer({
      enabled: true,
      port: 0, // Use random available port
    })
  })

  afterEach(() => {
    server.stop()
    if (httpServer) {
      httpServer.close()
      httpServer = null
    }
  })

  describe('log buffer management', () => {
    it('should add logs to buffer', () => {
      const logs: LogMessage[] = [
        { level: 1, domain: 'test', message: 'Log 1', timestamp: Date.now() },
        { level: 2, domain: 'test', message: 'Log 2', timestamp: Date.now() },
      ]

      server.addLogs(logs)
      const consumed = server.consumeLogs()

      expect(consumed).toHaveLength(2)
      expect(consumed[0].message).toBe('Log 1')
      expect(consumed[1].message).toBe('Log 2')
    })

    it('should clear buffer after consume', () => {
      server.addLogs([{ level: 1, domain: 'test', message: 'Log', timestamp: Date.now() }])

      server.consumeLogs()
      const secondConsume = server.consumeLogs()

      expect(secondConsume).toHaveLength(0)
    })

    it('should limit buffer size', () => {
      // Add more than maxLogBuffer (1000)
      const logs: LogMessage[] = []
      for (let i = 0; i < 1100; i++) {
        logs.push({ level: 1, domain: 'test', message: `Log ${i}`, timestamp: Date.now() })
      }

      server.addLogs(logs)
      const consumed = server.consumeLogs()

      expect(consumed.length).toBeLessThanOrEqual(1000)
    })

    it('should notify listeners when logs are added', () => {
      const listener = vi.fn()
      server.onLogs(listener)

      const logs: LogMessage[] = [
        { level: 1, domain: 'test', message: 'Log', timestamp: Date.now() },
      ]
      server.addLogs(logs)

      expect(listener).toHaveBeenCalledWith(logs)
    })

    it('should allow removing listeners', () => {
      const listener = vi.fn()
      const unsubscribe = server.onLogs(listener)

      unsubscribe()

      server.addLogs([{ level: 1, domain: 'test', message: 'Log', timestamp: Date.now() }])
      expect(listener).not.toHaveBeenCalled()
    })
  })

  describe('server lifecycle', () => {
    it('should not start if disabled', () => {
      const disabledServer = new HotReloadServer({ enabled: false, port: 3847 })
      disabledServer.start()
      expect(disabledServer.isRunning()).toBe(false)
    })

    it('should report running status', () => {
      expect(server.isRunning()).toBe(false)
      // Note: We can't easily test start() without binding to a port
    })
  })
})

describe('HotReloadServer HTTP endpoints', () => {
  let server: HotReloadServer
  let port: number

  beforeEach(async () => {
    // Find an available port
    port = 30000 + Math.floor(Math.random() * 10000)
    server = new HotReloadServer({
      enabled: true,
      port,
    })
    server.start()
    // Wait for server to start
    await new Promise((r) => setTimeout(r, 100))
  })

  afterEach(() => {
    server.stop()
  })

  const makeRequest = (
    method: string,
    path: string,
    body?: string,
  ): Promise<{ status: number; body: string }> => {
    return new Promise((resolve, reject) => {
      const req = http.request(
        {
          hostname: '127.0.0.1',
          port,
          path,
          method,
          headers: body ? { 'Content-Type': 'application/json' } : {},
        },
        (res) => {
          let data = ''
          res.on('data', (chunk) => {
            data += chunk
          })
          res.on('end', () => resolve({ status: res.statusCode ?? 0, body: data }))
        },
      )
      req.on('error', reject)
      if (body) req.write(body)
      req.end()
    })
  }

  describe('GET /health', () => {
    it('should return health status', async () => {
      const res = await makeRequest('GET', '/health')

      expect(res.status).toBe(200)
      const data = JSON.parse(res.body)
      expect(data.status).toBe('ok')
      expect(data.resource).toBe('test-resource')
      expect(data.timestamp).toBeDefined()
    })
  })

  describe('GET /logs', () => {
    it('should return buffered logs', async () => {
      server.addLogs([{ level: 1, domain: 'test', message: 'Test log', timestamp: 1234567890 }])

      const res = await makeRequest('GET', '/logs')

      expect(res.status).toBe(200)
      const data = JSON.parse(res.body)
      expect(data.logs).toHaveLength(1)
      expect(data.logs[0].message).toBe('Test log')
      expect(data.timestamp).toBeDefined()
    })

    it('should clear buffer after GET', async () => {
      server.addLogs([{ level: 1, domain: 'test', message: 'Test', timestamp: Date.now() }])

      await makeRequest('GET', '/logs')
      const res = await makeRequest('GET', '/logs')

      const data = JSON.parse(res.body)
      expect(data.logs).toHaveLength(0)
    })
  })

  describe('POST /logs', () => {
    it('should accept logs and add to buffer', async () => {
      const payload = JSON.stringify({
        type: 'logs',
        payload: [{ level: 1, domain: 'test', message: 'Posted log', timestamp: Date.now() }],
      })

      const res = await makeRequest('POST', '/logs', payload)

      expect(res.status).toBe(200)
      const data = JSON.parse(res.body)
      expect(data.success).toBe(true)
      expect(data.received).toBe(1)

      // Verify logs were added
      const logs = server.consumeLogs()
      expect(logs).toHaveLength(1)
      expect(logs[0].message).toBe('Posted log')
    })

    it('should reject invalid JSON', async () => {
      const res = await makeRequest('POST', '/logs', 'not json')

      expect(res.status).toBe(400)
      const data = JSON.parse(res.body)
      expect(data.error).toBe('Invalid JSON')
    })

    it('should reject invalid payload format', async () => {
      const res = await makeRequest('POST', '/logs', JSON.stringify({ type: 'wrong' }))

      expect(res.status).toBe(400)
      const data = JSON.parse(res.body)
      expect(data.error).toBe('Invalid payload format')
    })
  })

  describe('POST /restart', () => {
    it('should restart a resource', async () => {
      const res = await makeRequest('POST', '/restart?resource=my-resource')

      expect(res.status).toBe(200)
      const data = JSON.parse(res.body)
      expect(data.success).toBe(true)
      expect(data.resource).toBe('my-resource')
      expect(ExecuteCommand).toHaveBeenCalledWith('restart my-resource')
    })

    it('should reject missing resource parameter', async () => {
      const res = await makeRequest('POST', '/restart')

      expect(res.status).toBe(400)
      const data = JSON.parse(res.body)
      expect(data.error).toBe('Missing resource parameter')
    })

    it('should reject restarting self', async () => {
      const res = await makeRequest('POST', '/restart?resource=test-resource')

      expect(res.status).toBe(400)
      const data = JSON.parse(res.body)
      expect(data.error).toContain('Cannot restart')
    })
  })

  describe('POST /refresh', () => {
    it('should execute refresh command', async () => {
      const res = await makeRequest('POST', '/refresh')

      expect(res.status).toBe(200)
      const data = JSON.parse(res.body)
      expect(data.success).toBe(true)
      expect(ExecuteCommand).toHaveBeenCalledWith('refresh')
    })
  })

  describe('404 handling', () => {
    it('should return 404 for unknown routes', async () => {
      const res = await makeRequest('GET', '/unknown')

      expect(res.status).toBe(404)
      const data = JSON.parse(res.body)
      expect(data.error).toBe('Not found')
    })
  })

  describe('CORS', () => {
    it('should handle OPTIONS preflight', async () => {
      const res = await makeRequest('OPTIONS', '/logs')
      expect(res.status).toBe(204)
    })
  })
})
