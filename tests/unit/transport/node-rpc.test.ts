import 'reflect-metadata'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { NodeRpc } from '../../../src/adapters/node/transport/node.rpc'

describe('NodeRpc', () => {
  let rpc: NodeRpc

  beforeEach(() => {
    rpc = new NodeRpc('server')
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  // ═══════════════════════════════════════════════════════════════════════════
  // on() + call() basic flow
  // ═══════════════════════════════════════════════════════════════════════════
  describe('on + call', () => {
    it('should register a handler and return its result via call()', async () => {
      rpc.on('math:add', async (_ctx, a: number, b: number) => a + b)

      const result = await rpc.call<number>('math:add', [3, 7])
      expect(result).toBe(10)
    })

    it('should pass a requestId in the context', async () => {
      let receivedRequestId: string | undefined

      rpc.on('ping', async (ctx) => {
        receivedRequestId = ctx.requestId
        return 'pong'
      })

      await rpc.call('ping')
      expect(receivedRequestId).toBeDefined()
      expect(typeof receivedRequestId).toBe('string')
      expect(receivedRequestId!.length).toBeGreaterThan(0)
    })

    it('should generate unique requestIds per call', async () => {
      const ids: string[] = []

      rpc.on('track', async (ctx) => {
        ids.push(ctx.requestId)
        return true
      })

      await rpc.call('track')
      await rpc.call('track')
      await rpc.call('track')

      expect(ids.length).toBe(3)
      expect(new Set(ids).size).toBe(3)
    })

    it('should return undefined when handler returns nothing', async () => {
      rpc.on('void:handler', async () => {})

      const result = await rpc.call('void:handler')
      expect(result).toBeUndefined()
    })

    it('should handle synchronous handlers', async () => {
      rpc.on('sync', (_ctx) => 42)

      const result = await rpc.call<number>('sync')
      expect(result).toBe(42)
    })

    it('should pass args correctly', async () => {
      let receivedArgs: any[] = []

      rpc.on('args:test', async (_ctx, ...args: any[]) => {
        receivedArgs = args
      })

      await rpc.call('args:test', ['hello', 123, true, { key: 'value' }])

      expect(receivedArgs).toEqual(['hello', 123, true, { key: 'value' }])
    })

    it('should work with empty args', async () => {
      let receivedArgs: any[] = []

      rpc.on('no:args', async (_ctx, ...args: any[]) => {
        receivedArgs = args
      })

      await rpc.call('no:args')
      expect(receivedArgs).toEqual([])
    })
  })

  // ═══════════════════════════════════════════════════════════════════════════
  // Error handling
  // ═══════════════════════════════════════════════════════════════════════════
  describe('Error handling', () => {
    it('should throw when calling an unregistered handler', async () => {
      await expect(rpc.call('nonexistent')).rejects.toThrow(
        "NodeRpc: no handler registered for 'nonexistent'",
      )
    })

    it('should propagate handler errors through call()', async () => {
      rpc.on('fail', async () => {
        throw new Error('handler exploded')
      })

      await expect(rpc.call('fail')).rejects.toThrow('handler exploded')
    })

    it('should propagate typed errors', async () => {
      class CustomError extends Error {
        constructor(public code: string) {
          super(`Custom: ${code}`)
          this.name = 'CustomError'
        }
      }

      rpc.on('typed:fail', async () => {
        throw new CustomError('ERR_42')
      })

      try {
        await rpc.call('typed:fail')
        expect.unreachable('should have thrown')
      } catch (err: any) {
        expect(err).toBeInstanceOf(CustomError)
        expect(err.code).toBe('ERR_42')
      }
    })
  })

  // ═══════════════════════════════════════════════════════════════════════════
  // notify()
  // ═══════════════════════════════════════════════════════════════════════════
  describe('notify', () => {
    it('should call the handler without returning a value', async () => {
      let called = false

      rpc.on('side:effect', async () => {
        called = true
        return 'this value is ignored by notify'
      })

      const result = await rpc.notify('side:effect')
      expect(result).toBeUndefined()
      expect(called).toBe(true)
    })

    it('should silently succeed when no handler is registered', async () => {
      await expect(rpc.notify('missing')).resolves.toBeUndefined()
    })

    it('should pass args to the handler', async () => {
      let receivedArgs: any[] = []

      rpc.on('notify:args', async (_ctx, ...args: any[]) => {
        receivedArgs = args
      })

      await rpc.notify('notify:args', ['a', 'b'])
      expect(receivedArgs).toEqual(['a', 'b'])
    })
  })

  // ═══════════════════════════════════════════════════════════════════════════
  // call/notify with target overloads
  // ═══════════════════════════════════════════════════════════════════════════
  describe('Target overloads', () => {
    it('should accept target as second argument in call()', async () => {
      rpc.on('targeted', async (_ctx, msg: string) => `got: ${msg}`)

      const result = await rpc.call<string>('targeted', 42, ['hello'])
      expect(result).toBe('got: hello')
    })

    it('should accept target as second argument in notify()', async () => {
      let called = false

      rpc.on('targeted:notify', async () => {
        called = true
      })

      await rpc.notify('targeted:notify', 42, [])
      expect(called).toBe(true)
    })

    it('should accept "all" as target', async () => {
      rpc.on('broadcast', async () => 'ok')

      const result = await rpc.call<string>('broadcast', 'all', [])
      expect(result).toBe('ok')
    })
  })

  // ═══════════════════════════════════════════════════════════════════════════
  // Handler replacement
  // ═══════════════════════════════════════════════════════════════════════════
  describe('Handler replacement', () => {
    it('should replace handler when registering same name twice', async () => {
      rpc.on('replace:me', async () => 'first')
      rpc.on('replace:me', async () => 'second')

      const result = await rpc.call<string>('replace:me')
      expect(result).toBe('second')
    })
  })

  // ═══════════════════════════════════════════════════════════════════════════
  // Context in client mode
  // ═══════════════════════════════════════════════════════════════════════════
  describe('Client context', () => {
    it('should work in client context', async () => {
      const clientRpc = new NodeRpc('client')

      clientRpc.on('client:ping', async () => 'pong')

      const result = await clientRpc.call<string>('client:ping')
      expect(result).toBe('pong')
    })
  })
})
