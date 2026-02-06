import 'reflect-metadata'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { NodeEvents } from '../../../src/adapters/node/transport/node.events'

function waitForEventProcessing(): Promise<void> {
  return new Promise((resolve) => setImmediate(resolve))
}

describe('NodeEvents', () => {
  let events: NodeEvents

  beforeEach(() => {
    events = new NodeEvents()
  })

  afterEach(() => {
    events.clearHandlers()
    vi.clearAllMocks()
  })

  // ═══════════════════════════════════════════════════════════════════════════
  // on + emit basic flow
  // ═══════════════════════════════════════════════════════════════════════════
  describe('on + emit', () => {
    it('should receive events emitted to a specific clientId target', async () => {
      let receivedCtx: any
      let receivedArgs: any[] = []

      events.on('test:event', (ctx, ...args) => {
        receivedCtx = ctx
        receivedArgs = args
      })

      events.emit('test:event', 42, 'hello', 'world')

      await waitForEventProcessing()

      expect(receivedCtx).toBeDefined()
      expect(receivedCtx.clientId).toBe(42)
      expect(receivedArgs).toEqual(['hello', 'world'])
    })

    it('should receive events emitted to "all"', async () => {
      let receivedCtx: any

      events.on('broadcast', (ctx) => {
        receivedCtx = ctx
      })

      events.emit('broadcast', 'all', 'data')

      await waitForEventProcessing()

      expect(receivedCtx).toBeDefined()
      expect(receivedCtx.clientId).toBe(-1)
    })

    it('should emit to each clientId in an array target', async () => {
      const receivedClientIds: number[] = []

      events.on('multi', (ctx) => {
        receivedClientIds.push(ctx.clientId!)
      })

      events.emit('multi', [10, 20, 30])

      await waitForEventProcessing()

      expect(receivedClientIds).toEqual([10, 20, 30])
    })

    it('should treat non-target first arg as payload', async () => {
      let receivedArgs: any[] = []

      events.on('payload:first', (_ctx, ...args) => {
        receivedArgs = args
      })

      // First arg is an object (not a target), so it becomes payload
      events.emit('payload:first', { key: 'value' }, 'extra')

      await waitForEventProcessing()

      expect(receivedArgs).toEqual([{ key: 'value' }, 'extra'])
    })
  })

  // ═══════════════════════════════════════════════════════════════════════════
  // simulateClientEvent
  // ═══════════════════════════════════════════════════════════════════════════
  describe('simulateClientEvent', () => {
    it('should simulate an event from a specific client', async () => {
      let receivedCtx: any
      let receivedArgs: any[] = []

      events.on('client:action', (ctx, ...args) => {
        receivedCtx = ctx
        receivedArgs = args
      })

      events.simulateClientEvent('client:action', 7, 'arg1', 'arg2')

      await waitForEventProcessing()

      expect(receivedCtx.clientId).toBe(7)
      expect(receivedCtx.raw).toBe(7)
      expect(receivedArgs).toEqual(['arg1', 'arg2'])
    })

    it('should work with no extra args', async () => {
      let called = false

      events.on('client:ping', () => {
        called = true
      })

      events.simulateClientEvent('client:ping', 1)

      await waitForEventProcessing()

      expect(called).toBe(true)
    })
  })

  // ═══════════════════════════════════════════════════════════════════════════
  // Multiple handlers
  // ═══════════════════════════════════════════════════════════════════════════
  describe('Multiple handlers', () => {
    it('should call all handlers registered for the same event', async () => {
      let count = 0

      events.on('multi:handler', () => {
        count++
      })
      events.on('multi:handler', () => {
        count++
      })

      events.simulateClientEvent('multi:handler', 1)

      await waitForEventProcessing()

      expect(count).toBe(2)
    })
  })

  // ═══════════════════════════════════════════════════════════════════════════
  // Error handling
  // ═══════════════════════════════════════════════════════════════════════════
  describe('Error handling', () => {
    it('should catch async handler errors internally without crashing', async () => {
      events.on('error:event', async () => {
        throw new Error('async handler boom')
      })

      // Should not throw — async errors are caught by Promise.resolve().catch()
      events.simulateClientEvent('error:event', 1)

      await waitForEventProcessing()

      // If we got here, the async error was caught internally
      expect(true).toBe(true)
    })

    it('should not affect other handlers when one rejects asynchronously', async () => {
      let secondCalled = false

      events.on('mixed:event', async () => {
        throw new Error('first handler fails async')
      })
      events.on('mixed:event', async () => {
        secondCalled = true
      })

      events.simulateClientEvent('mixed:event', 1)

      await waitForEventProcessing()

      // Second handler should still be called (each handler is independent)
      expect(secondCalled).toBe(true)
    })
  })

  // ═══════════════════════════════════════════════════════════════════════════
  // clearHandlers
  // ═══════════════════════════════════════════════════════════════════════════
  describe('clearHandlers', () => {
    it('should remove all registered handlers', async () => {
      let called = false

      events.on('clear:test', () => {
        called = true
      })

      events.clearHandlers()

      events.simulateClientEvent('clear:test', 1)

      await waitForEventProcessing()

      expect(called).toBe(false)
    })
  })

  // ═══════════════════════════════════════════════════════════════════════════
  // No handler registered
  // ═══════════════════════════════════════════════════════════════════════════
  describe('No handler', () => {
    it('should silently ignore events with no handlers', () => {
      // Should not throw
      events.emit('nobody:listening', 1, 'data')
      events.simulateClientEvent('nobody:listening', 1, 'data')
    })
  })
})
