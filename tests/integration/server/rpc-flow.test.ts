import 'reflect-metadata'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { z } from 'zod'
import { NodeRpc } from '../../../src/adapters/node/transport/node.rpc'
import type { RpcHandlerOptions } from '../../../src/runtime/server/decorators/onRPC'
import { Public } from '../../../src/runtime/server/decorators/public'
import { Player } from '../../../src/runtime/server/entities/player'
import type { Players } from '../../../src/runtime/server/ports/players.api-port'
import { METADATA_KEYS } from '../../../src/runtime/server/system/metadata-server.keys'
import { OnRpcProcessor } from '../../../src/runtime/server/system/processors/onRpc.processor'

/**
 * Creates a mock Player instance with configurable session state.
 */
function createMockPlayer(options: { clientID: number; accountID?: string }): Player {
  const session = {
    clientID: options.clientID,
    accountID: options.accountID,
    meta: {} as Record<string, unknown>,
  }

  const player = {
    clientID: options.clientID,
    clientIDStr: options.clientID.toString(),
    accountID: options.accountID,
    emit: vi.fn(),
    getMeta: vi.fn((key: string) => session.meta[key]),
    setMeta: vi.fn((key: string, value: unknown) => {
      session.meta[key] = value
    }),
  } as unknown as Player

  return player
}

/**
 * Build RpcHandlerOptions manually because esbuild (used by vitest) does not
 * emit `design:paramtypes`, so the @OnRPC decorator cannot capture them.
 * We simulate what the decorator would produce at runtime with a real TS compiler.
 */
function buildMeta(
  eventName: string,
  schema: z.ZodType | undefined,
  paramTypes: unknown[],
): RpcHandlerOptions {
  return { eventName, schema, paramTypes }
}

describe('OnRpcProcessor – Server RPC Flow', () => {
  let rpc: NodeRpc<'server'>
  let mockPlayerService: Players
  let processor: OnRpcProcessor

  beforeEach(() => {
    rpc = new NodeRpc<'server'>('server')

    mockPlayerService = {
      getByClient: vi.fn(),
    } as any

    processor = new OnRpcProcessor(mockPlayerService, rpc)
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  // ═══════════════════════════════════════════════════════════════════════════
  // Basic handler registration and invocation
  // ═══════════════════════════════════════════════════════════════════════════
  describe('Basic registration', () => {
    it('should register handler and return result via RPC call', async () => {
      class TestController {
        async echo(_player: Player, msg: string) {
          return `echo: ${msg}`
        }
      }

      const instance = new TestController()
      const metadata = buildMeta('test:echo', z.tuple([z.string()]), [Player, String])

      const mockPlayer = createMockPlayer({ clientID: 1, accountID: 'acc-1' })
      vi.mocked(mockPlayerService.getByClient).mockReturnValue(mockPlayer)

      processor.process(instance, 'echo', metadata)

      const handler = (rpc as any).handlers.get('test:echo')
      expect(handler).toBeDefined()

      const result = await handler({ requestId: 'req-1', clientId: 1 }, 'hello')
      expect(result).toBe('echo: hello')
    })

    it('should pass Player as first argument to handler', async () => {
      let receivedPlayer: Player | undefined

      class TestController {
        async getPlayer(player: Player) {
          receivedPlayer = player
          return 'ok'
        }
      }

      const instance = new TestController()
      const metadata = buildMeta('test:player', z.tuple([]), [Player])

      const mockPlayer = createMockPlayer({ clientID: 5, accountID: 'acc-5' })
      vi.mocked(mockPlayerService.getByClient).mockReturnValue(mockPlayer)

      processor.process(instance, 'getPlayer', metadata)

      const handler = (rpc as any).handlers.get('test:player')
      await handler({ requestId: 'req-1', clientId: 5 })

      expect(receivedPlayer).toBe(mockPlayer)
    })
  })

  // ═══════════════════════════════════════════════════════════════════════════
  // Schema validation
  // ═══════════════════════════════════════════════════════════════════════════
  describe('Schema validation', () => {
    it('should reject RPC when payload fails tuple schema', async () => {
      class TestController {
        handlerCalled = false

        async handle(_player: Player, _name: string, _age: number) {
          this.handlerCalled = true
        }
      }

      const instance = new TestController()
      const metadata = buildMeta('validate:tuple', z.tuple([z.string(), z.number()]), [
        Player,
        String,
        Number,
      ])

      const mockPlayer = createMockPlayer({ clientID: 1, accountID: 'acc-1' })
      vi.mocked(mockPlayerService.getByClient).mockReturnValue(mockPlayer)

      processor.process(instance, 'handle', metadata)

      const handler = (rpc as any).handlers.get('validate:tuple')

      // Invalid: second arg should be number
      await expect(
        handler({ requestId: 'req-1', clientId: 1 }, 'name', 'not-a-number'),
      ).rejects.toThrow()

      expect(instance.handlerCalled).toBe(false)
    })

    it('should accept RPC when payload passes tuple schema', async () => {
      class TestController {
        receivedArgs: any[] = []

        async handle(_player: Player, name: string, age: number) {
          this.receivedArgs = [name, age]
          return 'ok'
        }
      }

      const instance = new TestController()
      const metadata = buildMeta('validate:tuple:ok', z.tuple([z.string(), z.number()]), [
        Player,
        String,
        Number,
      ])

      const mockPlayer = createMockPlayer({ clientID: 1, accountID: 'acc-1' })
      vi.mocked(mockPlayerService.getByClient).mockReturnValue(mockPlayer)

      processor.process(instance, 'handle', metadata)

      const handler = (rpc as any).handlers.get('validate:tuple:ok')
      const result = await handler({ requestId: 'req-1', clientId: 1 }, 'John', 30)

      expect(result).toBe('ok')
      expect(instance.receivedArgs).toEqual(['John', 30])
    })

    it('should reject RPC when payload fails object schema', async () => {
      class TestController {
        handlerCalled = false

        async handle(_player: Player, _dto: { id: number; name: string }) {
          this.handlerCalled = true
        }
      }

      const instance = new TestController()
      const metadata = buildMeta('validate:obj', z.object({ id: z.number(), name: z.string() }), [
        Player,
        Object,
      ])

      const mockPlayer = createMockPlayer({ clientID: 1, accountID: 'acc-1' })
      vi.mocked(mockPlayerService.getByClient).mockReturnValue(mockPlayer)

      processor.process(instance, 'handle', metadata)

      const handler = (rpc as any).handlers.get('validate:obj')

      // Invalid: id is not a number
      await expect(
        handler({ requestId: 'req-1', clientId: 1 }, { id: 'not-number' }),
      ).rejects.toThrow()

      expect(instance.handlerCalled).toBe(false)
    })

    it('should accept RPC when payload passes object schema', async () => {
      class TestController {
        receivedDto: any

        async handle(_player: Player, dto: { id: number; name: string }) {
          this.receivedDto = dto
          return dto
        }
      }

      const instance = new TestController()
      const metadata = buildMeta(
        'validate:obj:ok',
        z.object({ id: z.number(), name: z.string() }),
        [Player, Object],
      )

      const mockPlayer = createMockPlayer({ clientID: 1, accountID: 'acc-1' })
      vi.mocked(mockPlayerService.getByClient).mockReturnValue(mockPlayer)

      processor.process(instance, 'handle', metadata)

      const handler = (rpc as any).handlers.get('validate:obj:ok')
      const result = await handler({ requestId: 'req-1', clientId: 1 }, { id: 42, name: 'Test' })

      expect(result).toEqual({ id: 42, name: 'Test' })
      expect(instance.receivedDto).toEqual({ id: 42, name: 'Test' })
    })

    it('should reject object schema when multiple args are sent', async () => {
      class TestController {
        handlerCalled = false

        async handle(_player: Player, _dto: { value: string }) {
          this.handlerCalled = true
        }
      }

      const instance = new TestController()
      const metadata = buildMeta('validate:argcount', z.object({ value: z.string() }), [
        Player,
        Object,
      ])

      const mockPlayer = createMockPlayer({ clientID: 1, accountID: 'acc-1' })
      vi.mocked(mockPlayerService.getByClient).mockReturnValue(mockPlayer)

      processor.process(instance, 'handle', metadata)

      const handler = (rpc as any).handlers.get('validate:argcount')

      // Send 2 args when object schema expects exactly 1
      await expect(handler({ requestId: 'req-1', clientId: 1 }, 'arg1', 'arg2')).rejects.toThrow(
        'Invalid argument count',
      )

      expect(instance.handlerCalled).toBe(false)
    })
  })

  // ═══════════════════════════════════════════════════════════════════════════
  // Player resolution
  // ═══════════════════════════════════════════════════════════════════════════
  describe('Player resolution', () => {
    it('should ignore RPC when clientId is undefined', async () => {
      class TestController {
        handlerCalled = false

        async handle(_player: Player) {
          this.handlerCalled = true
        }
      }

      const instance = new TestController()
      // Mark as @Public via reflect metadata (same as decorator would)
      Reflect.defineMetadata(METADATA_KEYS.PUBLIC, true, TestController.prototype, 'handle')
      const metadata = buildMeta('player:missing:ctx', z.tuple([]), [Player])

      processor.process(instance, 'handle', metadata)

      const handler = (rpc as any).handlers.get('player:missing:ctx')
      const result = await handler({ requestId: 'req-1', clientId: undefined })

      expect(result).toBeUndefined()
      expect(instance.handlerCalled).toBe(false)
      expect(mockPlayerService.getByClient).not.toHaveBeenCalled()
    })

    it('should ignore RPC when player session is not found', async () => {
      class TestController {
        handlerCalled = false

        async handle(_player: Player) {
          this.handlerCalled = true
        }
      }

      const instance = new TestController()
      Reflect.defineMetadata(METADATA_KEYS.PUBLIC, true, TestController.prototype, 'handle')
      const metadata = buildMeta('player:not:found', z.tuple([]), [Player])

      vi.mocked(mockPlayerService.getByClient).mockReturnValue(undefined)

      processor.process(instance, 'handle', metadata)

      const handler = (rpc as any).handlers.get('player:not:found')
      const result = await handler({ requestId: 'req-1', clientId: 999 })

      expect(result).toBeUndefined()
      expect(instance.handlerCalled).toBe(false)
      expect(mockPlayerService.getByClient).toHaveBeenCalledWith(999)
    })
  })

  // ═══════════════════════════════════════════════════════════════════════════
  // Security: @Public / authentication
  // ═══════════════════════════════════════════════════════════════════════════
  describe('Security – @Public / authentication', () => {
    it('should block unauthenticated player on non-public handler', async () => {
      class TestController {
        handlerCalled = false

        async handle(_player: Player) {
          this.handlerCalled = true
        }
      }

      const instance = new TestController()
      // No @Public metadata → requires authentication
      const metadata = buildMeta('secure:action', z.tuple([]), [Player])

      const unauthPlayer = createMockPlayer({ clientID: 1, accountID: undefined })
      vi.mocked(mockPlayerService.getByClient).mockReturnValue(unauthPlayer)

      processor.process(instance, 'handle', metadata)

      const handler = (rpc as any).handlers.get('secure:action')
      const result = await handler({ requestId: 'req-1', clientId: 1 })

      expect(result).toBeUndefined()
      expect(instance.handlerCalled).toBe(false)
    })

    it('should allow authenticated player on non-public handler', async () => {
      class TestController {
        handlerCalled = false

        async handle(_player: Player) {
          this.handlerCalled = true
          return 'allowed'
        }
      }

      const instance = new TestController()
      const metadata = buildMeta('secure:action:ok', z.tuple([]), [Player])

      const authPlayer = createMockPlayer({ clientID: 1, accountID: 'acc-auth' })
      vi.mocked(mockPlayerService.getByClient).mockReturnValue(authPlayer)

      processor.process(instance, 'handle', metadata)

      const handler = (rpc as any).handlers.get('secure:action:ok')
      const result = await handler({ requestId: 'req-1', clientId: 1 })

      expect(result).toBe('allowed')
      expect(instance.handlerCalled).toBe(true)
    })

    it('should allow unauthenticated player on @Public() handler', async () => {
      class TestController {
        handlerCalled = false

        @Public()
        async handle(_player: Player) {
          this.handlerCalled = true
          return 'public-ok'
        }
      }

      const instance = new TestController()
      const metadata = buildMeta('public:action', z.tuple([]), [Player])

      const unauthPlayer = createMockPlayer({ clientID: 1, accountID: undefined })
      vi.mocked(mockPlayerService.getByClient).mockReturnValue(unauthPlayer)

      processor.process(instance, 'handle', metadata)

      const handler = (rpc as any).handlers.get('public:action')
      const result = await handler({ requestId: 'req-1', clientId: 1 })

      expect(result).toBe('public-ok')
      expect(instance.handlerCalled).toBe(true)
    })
  })

  // ═══════════════════════════════════════════════════════════════════════════
  // Signature validation at registration time
  // ═══════════════════════════════════════════════════════════════════════════
  describe('Signature validation', () => {
    it('should throw when paramTypes is empty', () => {
      class TestController {
        async handle(_player: Player) {}
      }

      const instance = new TestController()

      expect(() => {
        processor.process(instance, 'handle', {
          eventName: 'bad:sig',
          paramTypes: [],
        })
      }).toThrow("@OnRPC 'bad:sig' must declare at least (player: Player, ...args)")
    })

    it('should throw when paramTypes is undefined', () => {
      class TestController {
        async handle(_player: Player) {}
      }

      const instance = new TestController()

      expect(() => {
        processor.process(instance, 'handle', {
          eventName: 'bad:sig2',
          paramTypes: undefined,
        })
      }).toThrow("@OnRPC 'bad:sig2' must declare at least (player: Player, ...args)")
    })

    it('should throw when first param is not Player', () => {
      class TestController {
        async handle(_notPlayer: string) {}
      }

      const instance = new TestController()

      expect(() => {
        processor.process(instance, 'handle', {
          eventName: 'bad:first',
          paramTypes: [String],
        })
      }).toThrow("@OnRPC 'bad:first' must declare Player as the first parameter")
    })
  })

  // ═══════════════════════════════════════════════════════════════════════════
  // End-to-end: full RPC round-trip through NodeRpc
  // ═══════════════════════════════════════════════════════════════════════════
  describe('End-to-end round-trip', () => {
    it('should work as a full RPC call through NodeRpc transport', async () => {
      class MathController {
        async multiply(_player: Player, a: number, b: number) {
          return a * b
        }
      }

      const instance = new MathController()
      const metadata = buildMeta('math:multiply', z.tuple([z.number(), z.number()]), [
        Player,
        Number,
        Number,
      ])

      const mockPlayer = createMockPlayer({ clientID: 10, accountID: 'acc-10' })
      vi.mocked(mockPlayerService.getByClient).mockReturnValue(mockPlayer)

      processor.process(instance, 'multiply', metadata)

      // Invoke handler directly to simulate a real client call with clientId
      const handler = (rpc as any).handlers.get('math:multiply')
      const result = await handler({ requestId: 'req-e2e', clientId: 10 }, 6, 7)

      expect(result).toBe(42)
    })
  })
})
