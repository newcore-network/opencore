import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { LogLevel } from '../../../../src/kernel/shared/logger/logger.types'
import {
  createDevTransport,
  detectEnvironment,
  isHttpTransport,
  isWebSocketTransport,
  startDevTransport,
  stopDevTransport,
} from '../../../../src/kernel/shared/logger/transports/dev-transport.factory'
import { HttpLogTransport } from '../../../../src/kernel/shared/logger/transports/http.transport'
import { WebSocketLogTransport } from '../../../../src/kernel/shared/logger/transports/websocket.transport'

describe('dev-transport.factory', () => {
  describe('detectEnvironment', () => {
    it('should return "fivem" when GetCurrentResourceName is defined', () => {
      // GetCurrentResourceName is defined in test setup
      const env = detectEnvironment()
      expect(env).toBe('fivem')
    })

    it('should return "node" when GetCurrentResourceName is not defined', () => {
      const original = (globalThis as any).GetCurrentResourceName
      delete (globalThis as any).GetCurrentResourceName

      const env = detectEnvironment()
      expect(env).toBe('node')

      // Restore
      ;(globalThis as any).GetCurrentResourceName = original
    })
  })

  describe('createDevTransport', () => {
    afterEach(() => {
      vi.unstubAllGlobals()
    })

    it('should create HttpLogTransport when forced', () => {
      const transport = createDevTransport({
        httpUrl: 'http://localhost:3847/logs',
        forceTransport: 'http',
      })

      expect(transport).toBeInstanceOf(HttpLogTransport)
      expect(transport.name).toBe('http')
      transport.destroy?.()
    })

    it('should create WebSocketLogTransport when forced', () => {
      // Mock WebSocket availability
      vi.stubGlobal('WebSocket', class {})

      const transport = createDevTransport({
        httpUrl: 'http://localhost:3847/logs',
        wsUrl: 'ws://localhost:3848',
        forceTransport: 'websocket',
      })

      expect(transport).toBeInstanceOf(WebSocketLogTransport)
      expect(transport.name).toBe('websocket')
      transport.destroy?.()
    })

    it('should use HTTP transport in FiveM environment', () => {
      vi.stubGlobal('GetCurrentResourceName', () => 'test-resource')

      const transport = createDevTransport({
        httpUrl: 'http://localhost:3847/logs',
        wsUrl: 'ws://localhost:3848',
      })

      expect(transport).toBeInstanceOf(HttpLogTransport)
      transport.destroy?.()
    })

    it('should use HTTP transport in Node.js when WebSocket unavailable', () => {
      // Ensure WebSocket is not available
      const originalWebSocket = (globalThis as any).WebSocket
      delete (globalThis as any).WebSocket

      const transport = createDevTransport({
        httpUrl: 'http://localhost:3847/logs',
      })

      expect(transport).toBeInstanceOf(HttpLogTransport)
      transport.destroy?.()

      // Restore
      if (originalWebSocket) {
        ;(globalThis as any).WebSocket = originalWebSocket
      }
    })

    it('should respect custom minLevel', () => {
      const transport = createDevTransport({
        httpUrl: 'http://localhost:3847/logs',
        forceTransport: 'http',
        minLevel: LogLevel.WARN,
      })

      expect(transport.minLevel).toBe(LogLevel.WARN)
      transport.destroy?.()
    })
  })

  describe('isHttpTransport', () => {
    it('should return true for HttpLogTransport', () => {
      const transport = new HttpLogTransport({ url: 'http://localhost:3847/logs' })
      expect(isHttpTransport(transport)).toBe(true)
      transport.destroy()
    })

    it('should return false for other transports', () => {
      vi.stubGlobal('WebSocket', class {})
      const transport = new WebSocketLogTransport({ url: 'ws://localhost:3848' })
      expect(isHttpTransport(transport)).toBe(false)
      transport.destroy()
      vi.unstubAllGlobals()
    })
  })

  describe('isWebSocketTransport', () => {
    beforeEach(() => {
      vi.stubGlobal('WebSocket', class {})
    })

    afterEach(() => {
      vi.unstubAllGlobals()
    })

    it('should return true for WebSocketLogTransport', () => {
      const transport = new WebSocketLogTransport({ url: 'ws://localhost:3848' })
      expect(isWebSocketTransport(transport)).toBe(true)
      transport.destroy()
    })

    it('should return false for other transports', () => {
      const transport = new HttpLogTransport({ url: 'http://localhost:3847/logs' })
      expect(isWebSocketTransport(transport)).toBe(false)
      transport.destroy()
    })
  })

  describe('startDevTransport', () => {
    it('should call start() for HttpLogTransport', async () => {
      const transport = new HttpLogTransport({ url: 'http://localhost:3847/logs' })
      const startSpy = vi.spyOn(transport, 'start')

      await startDevTransport(transport)

      expect(startSpy).toHaveBeenCalled()
      transport.destroy()
    })
  })

  describe('stopDevTransport', () => {
    it('should call stop() for HttpLogTransport', async () => {
      const transport = new HttpLogTransport({ url: 'http://localhost:3847/logs' })
      const stopSpy = vi.spyOn(transport, 'stop')

      await stopDevTransport(transport)

      expect(stopSpy).toHaveBeenCalled()
      transport.destroy()
    })
  })
})
