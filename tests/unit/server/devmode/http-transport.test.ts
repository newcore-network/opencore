import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { HttpLogTransport } from '../../../../src/kernel/shared/logger/transports/http.transport'
import {
  LogDomain,
  LogLevel,
  type LogEntry,
} from '../../../../src/kernel/shared/logger/logger.types'

const createEntry = (overrides: Partial<LogEntry> = {}): LogEntry => ({
  level: LogLevel.INFO,
  domain: LogDomain.FRAMEWORK,
  message: 'Test message',
  timestamp: Date.now().toString(),
  ...overrides,
})

describe('HttpLogTransport', () => {
  let transport: HttpLogTransport

  beforeEach(() => {
    vi.clearAllMocks()
    transport = new HttpLogTransport({
      url: 'http://localhost:3847/logs',
      batchSize: 5,
      flushInterval: 100,
      maxBufferSize: 50,
    })
  })

  afterEach(() => {
    transport.destroy()
  })

  describe('constructor', () => {
    it('should create transport with default options', () => {
      const t = new HttpLogTransport({ url: 'http://localhost:3847/logs' })
      expect(t.name).toBe('http')
      expect(t.minLevel).toBe(LogLevel.DEBUG)
      t.destroy()
    })

    it('should accept custom minLevel', () => {
      const t = new HttpLogTransport({ url: 'http://localhost:3847/logs' }, LogLevel.WARN)
      expect(t.minLevel).toBe(LogLevel.WARN)
      t.destroy()
    })
  })

  describe('write', () => {
    it('should buffer log entries without crashing', () => {
      const entry = createEntry()
      transport.write(entry)
      transport.write(entry)
      transport.write(entry)
    })

    it('should respect maxBufferSize without crashing', () => {
      const t = new HttpLogTransport({
        url: 'http://localhost:3847/logs',
        maxBufferSize: 3,
        batchSize: 100,
      })

      const entry = createEntry()
      for (let i = 0; i < 10; i++) {
        t.write(entry)
      }

      t.destroy()
    })
  })

  describe('start/stop', () => {
    it('should start flush timer', () => {
      const setIntervalSpy = vi.spyOn(global, 'setInterval')
      transport.start()
      expect(setIntervalSpy).toHaveBeenCalledWith(expect.any(Function), 100)
      setIntervalSpy.mockRestore()
    })

    it('should not start multiple timers', () => {
      const setIntervalSpy = vi.spyOn(global, 'setInterval')
      transport.start()
      transport.start()
      transport.start()
      expect(setIntervalSpy).toHaveBeenCalledTimes(1)
      setIntervalSpy.mockRestore()
    })

    it('should stop and clear timer on stop', async () => {
      const clearIntervalSpy = vi.spyOn(global, 'clearInterval')
      transport.start()
      await transport.stop()
      expect(clearIntervalSpy).toHaveBeenCalled()
      clearIntervalSpy.mockRestore()
    })
  })

  describe('destroy', () => {
    it('should clear timer on destroy', () => {
      const clearIntervalSpy = vi.spyOn(global, 'clearInterval')
      transport.start()
      transport.write(createEntry())
      transport.destroy()
      expect(clearIntervalSpy).toHaveBeenCalled()
      clearIntervalSpy.mockRestore()
    })
  })
})
