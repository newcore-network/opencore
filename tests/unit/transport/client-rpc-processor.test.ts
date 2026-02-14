import 'reflect-metadata'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { z } from 'zod'
import { NodeRpc } from '../../../src/adapters/node/transport/node.rpc'
import { ClientOnRpcProcessor } from '../../../src/runtime/client/system/processors/onRpc.processor'
import { METADATA_KEYS } from '../../../src/runtime/client/system/metadata-client.keys'
import { OnRPC } from '../../../src/runtime/client/decorators/onRPC'

describe('ClientOnRpcProcessor', () => {
  let rpc: NodeRpc<'client'>
  let processor: ClientOnRpcProcessor

  beforeEach(() => {
    rpc = new NodeRpc<'client'>('client')
    processor = new ClientOnRpcProcessor(rpc)
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  // ═══════════════════════════════════════════════════════════════════════════
  // Basic handler registration
  // ═══════════════════════════════════════════════════════════════════════════
  describe('Basic registration', () => {
    it('should register handler and return result via RPC', async () => {
      class TestController {
        @OnRPC('client:ping')
        async ping() {
          return 'pong'
        }
      }

      const instance = new TestController()
      const metadata = Reflect.getMetadata(
        METADATA_KEYS.NET_RPC,
        TestController.prototype,
        'ping',
      )

      processor.process(instance, 'ping', metadata)

      const handler = (rpc as any).handlers.get('client:ping')
      expect(handler).toBeDefined()

      const result = await handler({ requestId: 'req-1' })
      expect(result).toBe('pong')
    })

    it('should pass args to handler (no schema)', async () => {
      class TestController {
        receivedArgs: any[] = []

        @OnRPC('client:args')
        async handle(...args: any[]) {
          this.receivedArgs = args
          return 'ok'
        }
      }

      const instance = new TestController()
      const metadata = Reflect.getMetadata(
        METADATA_KEYS.NET_RPC,
        TestController.prototype,
        'handle',
      )

      processor.process(instance, 'handle', metadata)

      const handler = (rpc as any).handlers.get('client:args')
      await handler({ requestId: 'req-1' }, 'a', 'b', 'c')

      expect(instance.receivedArgs).toEqual(['a', 'b', 'c'])
    })
  })

  // ═══════════════════════════════════════════════════════════════════════════
  // Schema validation
  // ═══════════════════════════════════════════════════════════════════════════
  describe('Schema validation', () => {
    it('should validate args with tuple schema', async () => {
      const schema = z.tuple([z.string(), z.number()])

      class TestController {
        receivedArgs: any[] = []

        @OnRPC('client:tuple', schema)
        async handle(name: string, count: number) {
          this.receivedArgs = [name, count]
          return 'ok'
        }
      }

      const instance = new TestController()
      const metadata = Reflect.getMetadata(
        METADATA_KEYS.NET_RPC,
        TestController.prototype,
        'handle',
      )

      processor.process(instance, 'handle', metadata)

      const handler = (rpc as any).handlers.get('client:tuple')
      const result = await handler({ requestId: 'req-1' }, 'test', 42)

      expect(result).toBe('ok')
      expect(instance.receivedArgs).toEqual(['test', 42])
    })

    it('should reject invalid tuple args', async () => {
      const schema = z.tuple([z.string(), z.number()])

      class TestController {
        handlerCalled = false

        @OnRPC('client:tuple:bad', schema)
        async handle(_name: string, _count: number) {
          this.handlerCalled = true
        }
      }

      const instance = new TestController()
      const metadata = Reflect.getMetadata(
        METADATA_KEYS.NET_RPC,
        TestController.prototype,
        'handle',
      )

      processor.process(instance, 'handle', metadata)

      const handler = (rpc as any).handlers.get('client:tuple:bad')

      await expect(
        handler({ requestId: 'req-1' }, 'valid', 'not-a-number'),
      ).rejects.toThrow()

      expect(instance.handlerCalled).toBe(false)
    })

    it('should validate args with object schema', async () => {
      const schema = z.object({ id: z.number(), name: z.string() })

      class TestController {
        receivedDto: any

        @OnRPC('client:obj', schema)
        async handle(dto: { id: number; name: string }) {
          this.receivedDto = dto
          return dto
        }
      }

      const instance = new TestController()
      const metadata = Reflect.getMetadata(
        METADATA_KEYS.NET_RPC,
        TestController.prototype,
        'handle',
      )

      processor.process(instance, 'handle', metadata)

      const handler = (rpc as any).handlers.get('client:obj')
      const result = await handler({ requestId: 'req-1' }, { id: 1, name: 'Test' })

      expect(result).toEqual({ id: 1, name: 'Test' })
      expect(instance.receivedDto).toEqual({ id: 1, name: 'Test' })
    })

    it('should reject object schema when multiple args sent', async () => {
      const schema = z.object({ value: z.string() })

      class TestController {
        handlerCalled = false

        @OnRPC('client:obj:multi', schema)
        async handle(_dto: { value: string }) {
          this.handlerCalled = true
        }
      }

      const instance = new TestController()
      const metadata = Reflect.getMetadata(
        METADATA_KEYS.NET_RPC,
        TestController.prototype,
        'handle',
      )

      processor.process(instance, 'handle', metadata)

      const handler = (rpc as any).handlers.get('client:obj:multi')

      await expect(
        handler({ requestId: 'req-1' }, 'arg1', 'arg2'),
      ).rejects.toThrow('Invalid argument count')

      expect(instance.handlerCalled).toBe(false)
    })
  })

  // ═══════════════════════════════════════════════════════════════════════════
  // Error handling
  // ═══════════════════════════════════════════════════════════════════════════
  describe('Error handling', () => {
    it('should propagate handler errors', async () => {
      class TestController {
        @OnRPC('client:fail')
        async handle() {
          throw new Error('client handler exploded')
        }
      }

      const instance = new TestController()
      const metadata = Reflect.getMetadata(
        METADATA_KEYS.NET_RPC,
        TestController.prototype,
        'handle',
      )

      processor.process(instance, 'handle', metadata)

      const handler = (rpc as any).handlers.get('client:fail')

      await expect(handler({ requestId: 'req-1' })).rejects.toThrow('client handler exploded')
    })
  })

  // ═══════════════════════════════════════════════════════════════════════════
  // No schema (passthrough)
  // ═══════════════════════════════════════════════════════════════════════════
  describe('No schema passthrough', () => {
    it('should pass args directly when no schema is provided', async () => {
      class TestController {
        receivedArgs: any[] = []

        @OnRPC('client:noschema')
        async handle(...args: any[]) {
          this.receivedArgs = args
          return args.length
        }
      }

      const instance = new TestController()
      const metadata = Reflect.getMetadata(
        METADATA_KEYS.NET_RPC,
        TestController.prototype,
        'handle',
      )

      processor.process(instance, 'handle', metadata)

      const handler = (rpc as any).handlers.get('client:noschema')
      const result = await handler({ requestId: 'req-1' }, 1, 2, 3)

      expect(result).toBe(3)
      expect(instance.receivedArgs).toEqual([1, 2, 3])
    })
  })
})
