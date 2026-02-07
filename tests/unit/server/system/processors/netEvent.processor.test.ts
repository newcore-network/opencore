import 'reflect-metadata'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { EventsAPI } from '../../../../../src/adapters/contracts/transport/events.api'
import type { EventContext } from '../../../../../src/adapters/contracts/transport/context'
import type { NetEventSecurityObserverContract } from '../../../../../src/runtime/server/contracts/security/net-event-security-observer.contract'
import type { SecurityHandlerContract } from '../../../../../src/runtime/server/contracts/security/security-handler.contract'
import { OnNet } from '../../../../../src/runtime/server/decorators/onNet'
import type { Player } from '../../../../../src/runtime/server/entities'
import type { Players } from '../../../../../src/runtime/server/ports/players.api-port'
import { METADATA_KEYS } from '../../../../../src/runtime/server/system/metadata-server.keys'
import { NetEventProcessor } from '../../../../../src/runtime/server/system/processors/netEvent.processor'

class MockEventsAPI extends EventsAPI {
  on(_event: string, _handler: (ctx: EventContext, ...args: any[]) => void | Promise<void>): void {}

  emit(_event: string, _targetOrArg?: number | number[] | 'all' | any, ..._args: any[]): void {}
}

describe('NetEventProcessor', () => {
  let mockPlayerService: Players
  let mockSecurityHandler: SecurityHandlerContract
  let mockObserver: NetEventSecurityObserverContract
  let mockEvents: MockEventsAPI
  let processor: NetEventProcessor

  beforeEach(() => {
    mockPlayerService = {
      getByClient: vi.fn(),
    } as any

    mockSecurityHandler = {
      handleViolation: vi.fn(),
    } as any

    mockObserver = {
      onInvalidPayload: vi.fn(),
    } as any

    mockEvents = new MockEventsAPI()

    processor = new NetEventProcessor(
      mockPlayerService,
      mockSecurityHandler,
      mockObserver,
      mockEvents,
    )
  })

  it('should register event using EventsAPI', () => {
    const onSpy = vi.spyOn(mockEvents, 'on')

    class TestController {
      @OnNet('test:event')
      handleTest(_player: Player) {}
    }

    const instance = new TestController()

    const metadata = Reflect.getMetadata(
      METADATA_KEYS.NET_EVENT,
      TestController.prototype,
      'handleTest',
    )

    processor.process(instance, 'handleTest', metadata)

    expect(onSpy).toHaveBeenCalledWith('test:event', expect.any(Function))
  })

  it('should use context.clientId instead of global source', async () => {
    const onSpy = vi.spyOn(mockEvents, 'on')

    const mockPlayer = {
      clientID: 123,
      accountID: 'test-account',
      emit: vi.fn(),
      getMeta: vi.fn(),
      setMeta: vi.fn(),
    } as any

    vi.mocked(mockPlayerService.getByClient).mockReturnValue(mockPlayer)

    class TestController {
      handlerCalled = false
      receivedPlayer: Player | null = null

      @OnNet('test:context')
      handleTest(player: Player) {
        this.handlerCalled = true
        this.receivedPlayer = player
      }
    }

    const instance = new TestController()
    const metadata = Reflect.getMetadata(
      METADATA_KEYS.NET_EVENT,
      TestController.prototype,
      'handleTest',
    )

    processor.process(instance, 'handleTest', metadata)

    expect(onSpy).toHaveBeenCalled()
    const registeredHandler = onSpy.mock.calls[0][1]

    await registeredHandler({ clientId: 123 })

    expect(mockPlayerService.getByClient).toHaveBeenCalledWith(123)

    expect(instance.handlerCalled).toBe(true)
    expect(instance.receivedPlayer).toBe(mockPlayer)
  })
})
