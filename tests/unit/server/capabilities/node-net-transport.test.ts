import 'reflect-metadata'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NodeNetTransport } from '../../../../src/adapters/node/node-net-transport'

describe('NodeNetTransport', () => {
  let transport: NodeNetTransport

  beforeEach(() => {
    transport = new NodeNetTransport()
  })

  it('should register net event handler', () => {
    const handler = vi.fn()

    transport.onNet('testEvent', handler)

    // Handler should be registered (no errors)
    expect(handler).not.toHaveBeenCalled()
  })

  it('should invoke handler when event is emitted', async () => {
    const handler = vi.fn()
    const eventName = 'playerConnect'

    transport.onNet(eventName, handler)
    transport.emitNet(eventName, 1, 'arg1', 'arg2')

    // Wait for event loop
    await new Promise((resolve) => setImmediate(resolve))

    expect(handler).toHaveBeenCalledTimes(1)
    expect(handler).toHaveBeenCalledWith(expect.objectContaining({ clientId: 1 }), 'arg1', 'arg2')
  })

  it('should pass correct clientId in context', async () => {
    const handler = vi.fn()
    const eventName = 'testEvent'
    const clientId = 42

    transport.onNet(eventName, handler)
    transport.emitNet(eventName, clientId, 'data')

    await new Promise((resolve) => setImmediate(resolve))

    expect(handler).toHaveBeenCalledWith(expect.objectContaining({ clientId: 42 }), 'data')
  })

  it('should support multiple handlers for same event', async () => {
    const handler1 = vi.fn()
    const handler2 = vi.fn()
    const eventName = 'multiHandler'

    transport.onNet(eventName, handler1)
    transport.onNet(eventName, handler2)
    transport.emitNet(eventName, 1, 'test')

    await new Promise((resolve) => setImmediate(resolve))

    expect(handler1).toHaveBeenCalledWith(expect.objectContaining({ clientId: 1 }), 'test')
    expect(handler2).toHaveBeenCalledWith(expect.objectContaining({ clientId: 1 }), 'test')
  })

  it('should support simulateClientEvent utility', async () => {
    const handler = vi.fn()
    const eventName = 'clientEvent'

    transport.onNet(eventName, handler)
    transport.simulateClientEvent(eventName, 99, 'payload')

    await new Promise((resolve) => setImmediate(resolve))

    expect(handler).toHaveBeenCalledWith(expect.objectContaining({ clientId: 99 }), 'payload')
  })

  it('should clear all handlers with clearHandlers', async () => {
    const handler = vi.fn()
    const eventName = 'clearTest'

    transport.onNet(eventName, handler)
    transport.clearHandlers()
    transport.emitNet(eventName, 1, 'data')

    await new Promise((resolve) => setImmediate(resolve))

    expect(handler).not.toHaveBeenCalled()
  })

  it('should handle array of target clients (use first)', async () => {
    const handler = vi.fn()
    const eventName = 'arrayTarget'

    transport.onNet(eventName, handler)
    transport.emitNet(eventName, [5, 10, 15], 'broadcast')

    await new Promise((resolve) => setImmediate(resolve))

    // Should use first client in array
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
