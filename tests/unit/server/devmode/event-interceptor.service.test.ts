import 'reflect-metadata'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { EventInterceptorService } from '../../../../src/runtime/server/devmode/event-interceptor.service'

describe('EventInterceptorService', () => {
  let interceptor: EventInterceptorService

  beforeEach(() => {
    interceptor = new EventInterceptorService()
    interceptor.configure({ enabled: true, recordHistory: true, maxHistorySize: 1000 })
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  describe('history ring buffer', () => {
    it('keeps only the most recent maxHistorySize events, in chronological order', () => {
      interceptor.configure({ maxHistorySize: 3 })

      for (let i = 0; i < 5; i++) {
        const id = interceptor.recordCommand(`cmd-${i}`, [])
        interceptor.completeEvent(id, 'ok', Date.now())
      }

      const history = interceptor.getEventHistory()
      expect(history).toHaveLength(3)
      expect(history.map((e) => e.name)).toEqual(['cmd-2', 'cmd-3', 'cmd-4'])
    })

    it('preserves order across capacity shrink via configure()', () => {
      for (let i = 0; i < 4; i++) {
        const id = interceptor.recordCommand(`cmd-${i}`, [])
        interceptor.completeEvent(id, 'ok', Date.now())
      }

      interceptor.configure({ maxHistorySize: 2 })

      expect(interceptor.getEventHistory().map((e) => e.name)).toEqual(['cmd-2', 'cmd-3'])
    })

    it('clearHistory empties the buffer', () => {
      const id = interceptor.recordCommand('cmd', [])
      interceptor.completeEvent(id, 'ok', Date.now())

      interceptor.clearHistory()

      expect(interceptor.getEventHistory()).toEqual([])
    })
  })

  describe('completeEvent / failEvent', () => {
    it('moves a pending event to history with its result', () => {
      const id = interceptor.recordCommand('heal', ['10'])
      interceptor.completeEvent(id, { healed: true }, Date.now())

      const [event] = interceptor.getEventHistory()
      expect(event.result).toEqual({ healed: true })
      expect(event.duration).toBeGreaterThanOrEqual(0)
    })

    it('moves a pending event to history with its error', () => {
      const id = interceptor.recordCommand('heal', ['10'])
      interceptor.failEvent(id, 'boom', Date.now())

      const [event] = interceptor.getEventHistory()
      expect(event.error).toBe('boom')
    })

    it('is a no-op for an unknown event id', () => {
      expect(() => interceptor.completeEvent('nope', 'ok', Date.now())).not.toThrow()
      expect(interceptor.getEventHistory()).toEqual([])
    })
  })

  describe('pending event pruning', () => {
    it('drops pending events that never complete before they can leak forever', () => {
      vi.useFakeTimers()
      vi.setSystemTime(0)

      const staleId = interceptor.recordCommand('never-completed', [])

      // Past the 5-minute staleness window.
      vi.setSystemTime(5 * 60 * 1000 + 1)

      // Recording a new event triggers the sweep of stale pending entries.
      const freshId = interceptor.recordCommand('fresh', [])

      // The stale entry is gone, so completing it now is a no-op.
      interceptor.completeEvent(staleId, 'late', Date.now())
      interceptor.completeEvent(freshId, 'ok', Date.now())

      const history = interceptor.getEventHistory()
      expect(history).toHaveLength(1)
      expect(history[0].name).toBe('fresh')
    })
  })

  describe('queries', () => {
    it('getEventsByType filters by type', () => {
      const cmdId = interceptor.recordCommand('cmd', [])
      interceptor.completeEvent(cmdId, 'ok', Date.now())
      const exportId = interceptor.recordExport('export', [])
      interceptor.completeEvent(exportId, 'ok', Date.now())

      expect(interceptor.getEventsByType('command')).toHaveLength(1)
      expect(interceptor.getEventsByType('export')).toHaveLength(1)
    })

    it('getStatistics aggregates totals, errors and average duration', () => {
      const okId = interceptor.recordCommand('ok-cmd', [])
      interceptor.completeEvent(okId, 'ok', Date.now())
      const failId = interceptor.recordCommand('fail-cmd', [])
      interceptor.failEvent(failId, 'boom', Date.now())

      const stats = interceptor.getStatistics()
      expect(stats.total).toBe(2)
      expect(stats.errors).toBe(1)
      expect(stats.byType.command).toBe(2)
    })
  })
})
