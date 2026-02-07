import 'reflect-metadata'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NodeEvents } from '../../../../src/adapters/node/transport/node.events'

describe('NodeEvents', () => {
  let events: NodeEvents

  beforeEach(() => {
    events = new NodeEvents()
  })

  it('should register event handler', () => {
    const handler = vi.fn()

    events.on('testEvent', handler)

    // Handler should be registered (no errors)
    expect(handler).not.toHaveBeenCalled()
  })

  it('should invoke handler when event is emitted', async () => {
    const handler = vi.fn()
    const eventName = 'playerConnect'

    events.on(eventName, handler)
    events.emit(eventName, 1, 'arg1', 'arg2')

    // Wait for event loop
    await new Promise((resolve) => setImmediate(resolve))

    expect(handler).toHaveBeenCalledTimes(1)
    expect(handler).toHaveBeenCalledWith(expect.objectContaining({ clientId: 1 }), 'arg1', 'arg2')
  })

  it('should pass correct clientId in context', async () => {
    const handler = vi.fn()
    const eventName = 'testEvent'
    const clientId = 42

    events.on(eventName, handler)
    events.emit(eventName, clientId, 'data')

    await new Promise((resolve) => setImmediate(resolve))

    expect(handler).toHaveBeenCalledWith(expect.objectContaining({ clientId: 42 }), 'data')
  })

  it('should support multiple handlers for same event', async () => {
    const handler1 = vi.fn()
    const handler2 = vi.fn()
    const eventName = 'multiHandler'

    events.on(eventName, handler1)
    events.on(eventName, handler2)
    events.emit(eventName, 1, 'test')

    await new Promise((resolve) => setImmediate(resolve))

    expect(handler1).toHaveBeenCalledWith(expect.objectContaining({ clientId: 1 }), 'test')
    expect(handler2).toHaveBeenCalledWith(expect.objectContaining({ clientId: 1 }), 'test')
  })

  it('should support simulateClientEvent utility', async () => {
    const handler = vi.fn()
    const eventName = 'clientEvent'

    events.on(eventName, handler)
    events.simulateClientEvent(eventName, 99, 'payload')

    await new Promise((resolve) => setImmediate(resolve))

    expect(handler).toHaveBeenCalledWith(expect.objectContaining({ clientId: 99 }), 'payload')
  })

  it('should clear all handlers with clearHandlers', async () => {
    const handler = vi.fn()
    const eventName = 'clearTest'

    events.on(eventName, handler)
    events.clearHandlers()
    events.emit(eventName, 1, 'data')

    await new Promise((resolve) => setImmediate(resolve))

    expect(handler).not.toHaveBeenCalled()
  })

  it('should handle array of target clients (use first)', async () => {
    const handler = vi.fn()
    const eventName = 'arrayTarget'

    events.on(eventName, handler)
    events.emit(eventName, [5, 10, 15], 'broadcast')

    await new Promise((resolve) => setImmediate(resolve))

    // Should emit to each client in array
    expect(handler).toHaveBeenCalledTimes(3)
    expect(handler).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({ clientId: 5 }),
      'broadcast',
    )
    expect(handler).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({ clientId: 10 }),
      'broadcast',
    )
    expect(handler).toHaveBeenNthCalledWith(
      3,
      expect.objectContaining({ clientId: 15 }),
      'broadcast',
    )
  })
})
