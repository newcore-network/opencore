import 'reflect-metadata'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { z } from 'zod'
import { NodeNetTransport } from '../../../src/adapters/node/node-net-transport'
import type { NetEventSecurityObserverContract } from '../../../src/runtime/server/contracts/security/net-event-security-observer.contract'
import type { SecurityHandlerContract } from '../../../src/runtime/server/contracts/security/security-handler.contract'
import { OnNet } from '../../../src/runtime/server/decorators/onNet'
import { Public } from '../../../src/runtime/server/decorators/public'
import type { Player } from '../../../src/runtime/server/entities'
import type { PlayerDirectoryPort } from '../../../src/runtime/server/services/ports/player-directory.port'
import { METADATA_KEYS } from '../../../src/runtime/server/system/metadata-server.keys'
import { NetEventProcessor } from '../../../src/runtime/server/system/processors/netEvent.processor'

/**
 * Creates a mock Player instance with configurable session state.
 */
function createMockPlayer(options: { clientID: number; accountID?: string }): Player {
  const session = {
    clientID: options.clientID,
    accountID: options.accountID,
    meta: {} as Record<string, unknown>,
  }

  // Create a partial Player mock that satisfies the interface
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
 * Helper to wait for async event processing
 */
function waitForEventProcessing(): Promise<void> {
  return new Promise((resolve) => setImmediate(resolve))
}

describe('NetEventProcessor Node Runtime Flow', () => {
  let transport: NodeNetTransport
  let mockPlayerService: PlayerDirectoryPort
  let mockSecurityHandler: SecurityHandlerContract
  let mockObserver: NetEventSecurityObserverContract
  let processor: NetEventProcessor

  beforeEach(() => {
    // Create fresh Node transport (no FiveM globals)
    transport = new NodeNetTransport()

    // Create mock services
    mockPlayerService = {
      getByClient: vi.fn(),
    } as any

    mockSecurityHandler = {
      handleViolation: vi.fn(),
    } as any

    mockObserver = {
      onInvalidPayload: vi.fn(),
    } as any

    // Create processor with Node transport
    processor = new NetEventProcessor(
      mockPlayerService,
      mockSecurityHandler,
      mockObserver,
      transport,
    )
  })

  afterEach(() => {
    transport.clearHandlers()
    vi.clearAllMocks()
  })

  // ═══════════════════════════════════════════════════════════════════════════
  // Test 1: Invalid payload → schema validation rejects the event
  // ═══════════════════════════════════════════════════════════════════════════
  describe('Schema Validation', () => {
    it('should reject event when payload fails Zod schema validation', async () => {
      // Schema expects: { username: string, age: number }
      const loginSchema = z.object({
        username: z.string().min(3),
        age: z.number().min(18),
      })

      class TestController {
        handlerCalled = false

        @OnNet('auth:login', { schema: loginSchema })
        handleLogin(_player: Player, _data: { username: string; age: number }) {
          this.handlerCalled = true
        }
      }

      const instance = new TestController()
      const metadata = Reflect.getMetadata(
        METADATA_KEYS.NET_EVENT,
        TestController.prototype,
        'handleLogin',
      )

      // Setup authenticated player
      const mockPlayer = createMockPlayer({ clientID: 1, accountID: 'acc-123' })
      vi.mocked(mockPlayerService.getByClient).mockReturnValue(mockPlayer)

      // Register handler
      processor.process(instance, 'handleLogin', metadata)

      // Simulate invalid payload: age is string instead of number
      transport.simulateClientEvent('auth:login', 1, { username: 'ab', age: 'seventeen' })

      await waitForEventProcessing()

      // Handler should NOT be called
      expect(instance.handlerCalled).toBe(false)

      // Security observer should be notified
      expect(mockObserver.onInvalidPayload).toHaveBeenCalledWith(
        mockPlayer,
        expect.objectContaining({
          event: 'auth:login',
          reason: 'zod',
          playerId: 1,
        }),
      )

      // Security handler should receive violation
      expect(mockSecurityHandler.handleViolation).toHaveBeenCalled()
    })

    it('should accept event when payload passes schema validation', async () => {
      const loginSchema = z.object({
        username: z.string().min(3),
        age: z.number().min(18),
      })

      class TestController {
        handlerCalled = false
        receivedData: any = null

        @OnNet('auth:login', { schema: loginSchema })
        handleLogin(_player: Player, data: { username: string; age: number }) {
          this.handlerCalled = true
          this.receivedData = data
        }
      }

      const instance = new TestController()
      const metadata = Reflect.getMetadata(
        METADATA_KEYS.NET_EVENT,
        TestController.prototype,
        'handleLogin',
      )

      const mockPlayer = createMockPlayer({ clientID: 1, accountID: 'acc-123' })
      vi.mocked(mockPlayerService.getByClient).mockReturnValue(mockPlayer)

      processor.process(instance, 'handleLogin', metadata)

      // Valid payload
      transport.simulateClientEvent('auth:login', 1, { username: 'john', age: 25 })

      await waitForEventProcessing()

      expect(instance.handlerCalled).toBe(true)
      expect(instance.receivedData).toEqual({ username: 'john', age: 25 })
      expect(mockObserver.onInvalidPayload).not.toHaveBeenCalled()
    })

    it('should reject event with wrong argument count for single-arg schema', async () => {
      const dataSchema = z.object({ value: z.string() })

      class TestController {
        handlerCalled = false

        @OnNet('data:submit', { schema: dataSchema })
        handleSubmit(_player: Player, _data: { value: string }) {
          this.handlerCalled = true
        }
      }

      const instance = new TestController()
      const metadata = Reflect.getMetadata(
        METADATA_KEYS.NET_EVENT,
        TestController.prototype,
        'handleSubmit',
      )

      const mockPlayer = createMockPlayer({ clientID: 1, accountID: 'acc-123' })
      vi.mocked(mockPlayerService.getByClient).mockReturnValue(mockPlayer)

      processor.process(instance, 'handleSubmit', metadata)

      // Send multiple args when schema expects single object
      transport.simulateClientEvent('data:submit', 1, 'arg1', 'arg2', 'arg3')

      await waitForEventProcessing()

      expect(instance.handlerCalled).toBe(false)
      expect(mockObserver.onInvalidPayload).toHaveBeenCalledWith(
        mockPlayer,
        expect.objectContaining({
          event: 'data:submit',
          reason: 'arg_count',
        }),
      )
    })
  })

  // ═══════════════════════════════════════════════════════════════════════════
  // Test 2: Unknown session → event is ignored safely
  // ═══════════════════════════════════════════════════════════════════════════
  describe('Unknown Session Handling', () => {
    it('should ignore event when player session is not found', async () => {
      class TestController {
        handlerCalled = false

        @Public()
        @OnNet('player:action')
        handleAction(_player: Player) {
          this.handlerCalled = true
        }
      }

      const instance = new TestController()
      const metadata = Reflect.getMetadata(
        METADATA_KEYS.NET_EVENT,
        TestController.prototype,
        'handleAction',
      )

      // PlayerService returns undefined (no session)
      vi.mocked(mockPlayerService.getByClient).mockReturnValue(undefined)

      processor.process(instance, 'handleAction', metadata)

      // Simulate event from unknown client
      transport.simulateClientEvent('player:action', 999)

      await waitForEventProcessing()

      // Handler should NOT be called
      expect(instance.handlerCalled).toBe(false)

      // PlayerService should have been queried
      expect(mockPlayerService.getByClient).toHaveBeenCalledWith(999)

      // No security violations - just ignored
      expect(mockSecurityHandler.handleViolation).not.toHaveBeenCalled()
      expect(mockObserver.onInvalidPayload).not.toHaveBeenCalled()
    })

    it('should process event when player session exists', async () => {
      class TestController {
        handlerCalled = false

        @Public()
        @OnNet('player:action')
        handleAction(_player: Player) {
          this.handlerCalled = true
        }
      }

      const instance = new TestController()
      const metadata = Reflect.getMetadata(
        METADATA_KEYS.NET_EVENT,
        TestController.prototype,
        'handleAction',
      )

      const mockPlayer = createMockPlayer({ clientID: 42 })
      vi.mocked(mockPlayerService.getByClient).mockReturnValue(mockPlayer)

      processor.process(instance, 'handleAction', metadata)

      transport.simulateClientEvent('player:action', 42)

      await waitForEventProcessing()

      expect(instance.handlerCalled).toBe(true)
    })
  })

  // ═══════════════════════════════════════════════════════════════════════════
  // Test 3: Secure-by-default → auth-required handler is blocked
  // ═══════════════════════════════════════════════════════════════════════════
  describe('Secure-by-Default Authentication', () => {
    it('should block unauthenticated player on non-public handler', async () => {
      class TestController {
        handlerCalled = false

        // No @Public() decorator - requires authentication by default
        @OnNet('secure:action')
        handleSecureAction(_player: Player) {
          this.handlerCalled = true
        }
      }

      const instance = new TestController()
      const metadata = Reflect.getMetadata(
        METADATA_KEYS.NET_EVENT,
        TestController.prototype,
        'handleSecureAction',
      )

      // Player exists but has no accountID (not authenticated)
      const unauthenticatedPlayer = createMockPlayer({
        clientID: 1,
        accountID: undefined,
      })
      vi.mocked(mockPlayerService.getByClient).mockReturnValue(unauthenticatedPlayer)

      processor.process(instance, 'handleSecureAction', metadata)

      transport.simulateClientEvent('secure:action', 1)

      await waitForEventProcessing()

      // Handler should NOT be called
      expect(instance.handlerCalled).toBe(false)

      // Player should receive auth required event
      expect(unauthenticatedPlayer.emit).toHaveBeenCalledWith('core:auth:required', {
        event: 'secure:action',
      })
    })

    it('should allow authenticated player on non-public handler', async () => {
      class TestController {
        handlerCalled = false

        @OnNet('secure:action')
        handleSecureAction(_player: Player) {
          this.handlerCalled = true
        }
      }

      const instance = new TestController()
      const metadata = Reflect.getMetadata(
        METADATA_KEYS.NET_EVENT,
        TestController.prototype,
        'handleSecureAction',
      )

      // Player is authenticated (has accountID)
      const authenticatedPlayer = createMockPlayer({
        clientID: 1,
        accountID: 'account-456',
      })
      vi.mocked(mockPlayerService.getByClient).mockReturnValue(authenticatedPlayer)

      processor.process(instance, 'handleSecureAction', metadata)

      transport.simulateClientEvent('secure:action', 1)

      await waitForEventProcessing()

      // Handler SHOULD be called
      expect(instance.handlerCalled).toBe(true)

      // No auth required event emitted
      expect(authenticatedPlayer.emit).not.toHaveBeenCalled()
    })

    it('should allow unauthenticated player on @Public() handler', async () => {
      class TestController {
        handlerCalled = false

        @Public()
        @OnNet('public:info')
        handlePublicInfo(_player: Player) {
          this.handlerCalled = true
        }
      }

      const instance = new TestController()
      const metadata = Reflect.getMetadata(
        METADATA_KEYS.NET_EVENT,
        TestController.prototype,
        'handlePublicInfo',
      )

      // Player NOT authenticated
      const unauthenticatedPlayer = createMockPlayer({
        clientID: 1,
        accountID: undefined,
      })
      vi.mocked(mockPlayerService.getByClient).mockReturnValue(unauthenticatedPlayer)

      processor.process(instance, 'handlePublicInfo', metadata)

      transport.simulateClientEvent('public:info', 1)

      await waitForEventProcessing()

      // Handler SHOULD be called (public endpoint)
      expect(instance.handlerCalled).toBe(true)

      // No auth required event
      expect(unauthenticatedPlayer.emit).not.toHaveBeenCalled()
    })
  })

  // ═══════════════════════════════════════════════════════════════════════════
  // Additional regression tests
  // ═══════════════════════════════════════════════════════════════════════════
  describe('Regression Coverage', () => {
    it('should track invalid payload count per player per event', async () => {
      const schema = z.object({ id: z.number() })

      class TestController {
        @OnNet('track:event', { schema })
        handleEvent(_player: Player, _data: { id: number }) {}
      }

      const instance = new TestController()
      const metadata = Reflect.getMetadata(
        METADATA_KEYS.NET_EVENT,
        TestController.prototype,
        'handleEvent',
      )

      const mockPlayer = createMockPlayer({ clientID: 1, accountID: 'acc-1' })
      vi.mocked(mockPlayerService.getByClient).mockReturnValue(mockPlayer)

      processor.process(instance, 'handleEvent', metadata)

      // Send multiple invalid payloads
      transport.simulateClientEvent('track:event', 1, { id: 'not-a-number' })
      await waitForEventProcessing()

      transport.simulateClientEvent('track:event', 1, { id: 'still-invalid' })
      await waitForEventProcessing()

      transport.simulateClientEvent('track:event', 1, { id: 'third-invalid' })
      await waitForEventProcessing()

      // Observer should be called 3 times with incrementing counts
      expect(mockObserver.onInvalidPayload).toHaveBeenCalledTimes(3)

      const calls = vi.mocked(mockObserver.onInvalidPayload).mock.calls
      expect(calls[0][1].invalidCount).toBe(1)
      expect(calls[1][1].invalidCount).toBe(2)
      expect(calls[2][1].invalidCount).toBe(3)
    })

    it('should handle tuple schema validation correctly', async () => {
      // Tuple schema: [string, number, boolean]
      const tupleSchema = z.tuple([z.string(), z.number(), z.boolean()])

      class TestController {
        receivedArgs: any[] = []

        @OnNet('tuple:event', { schema: tupleSchema })
        handleTuple(_player: Player, name: string, count: number, active: boolean) {
          this.receivedArgs = [name, count, active]
        }
      }

      const instance = new TestController()
      const metadata = Reflect.getMetadata(
        METADATA_KEYS.NET_EVENT,
        TestController.prototype,
        'handleTuple',
      )

      const mockPlayer = createMockPlayer({ clientID: 1, accountID: 'acc-1' })
      vi.mocked(mockPlayerService.getByClient).mockReturnValue(mockPlayer)

      processor.process(instance, 'handleTuple', metadata)

      // Valid tuple args
      transport.simulateClientEvent('tuple:event', 1, 'test', 42, true)

      await waitForEventProcessing()

      expect(instance.receivedArgs).toEqual(['test', 42, true])
    })

    it('should work with NodeNetTransport without calling FiveM globals', async () => {
      // Track if any FiveM global was called during event processing
      const originalOnNet = (globalThis as any).onNet
      const originalEmitNet = (globalThis as any).emitNet
      let fivemGlobalsCalled = false

      // Temporarily replace with tracking wrappers
      ;(globalThis as any).onNet = (...args: any[]) => {
        fivemGlobalsCalled = true
        return originalOnNet?.(...args)
      }
      ;(globalThis as any).emitNet = (...args: any[]) => {
        fivemGlobalsCalled = true
        return originalEmitNet?.(...args)
      }

      try {
        class TestController {
          called = false

          @Public()
          @OnNet('node:only')
          handle(_player: Player) {
            this.called = true
          }
        }

        const instance = new TestController()
        const metadata = Reflect.getMetadata(
          METADATA_KEYS.NET_EVENT,
          TestController.prototype,
          'handle',
        )

        const mockPlayer = createMockPlayer({ clientID: 1 })
        vi.mocked(mockPlayerService.getByClient).mockReturnValue(mockPlayer)

        // Process and trigger event using NodeNetTransport
        processor.process(instance, 'handle', metadata)
        transport.simulateClientEvent('node:only', 1)

        await waitForEventProcessing()

        // Handler should be called
        expect(instance.called).toBe(true)

        // FiveM globals should NOT have been called - NodeNetTransport uses EventEmitter
        expect(fivemGlobalsCalled).toBe(false)
      } finally {
        // Restore original globals
        ;(globalThis as any).onNet = originalOnNet
        ;(globalThis as any).emitNet = originalEmitNet
      }
    })
  })
})
