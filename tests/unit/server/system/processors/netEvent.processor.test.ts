import 'reflect-metadata'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { INetTransport, type NetEventContext } from '../../../../../src/adapters'
import type { NetEventSecurityObserverContract } from '../../../../../src/runtime/server/contracts/security/net-event-security-observer.contract'
import type { SecurityHandlerContract } from '../../../../../src/runtime/server/contracts/security/security-handler.contract'
import { OnNet } from '../../../../../src/runtime/server/decorators/onNet'
import type { Player } from '../../../../../src/runtime/server/entities'
import type { Players } from '../../../../../src/runtime/server/ports/player-directory'
import { METADATA_KEYS } from '../../../../../src/runtime/server/system/metadata-server.keys'
import { NetEventProcessor } from '../../../../../src/runtime/server/system/processors/netEvent.processor'

class MockNetTransport extends INetTransport {
  onNet(
    _eventName: string,
    _handler: (ctx: NetEventContext, ...args: any[]) => void | Promise<void>,
  ): void {}

  emitNet(_eventName: string, _target: number | 'all', ..._args: any[]): void {}
}

describe('NetEventProcessor', () => {
  let mockPlayerService: Players
  let mockSecurityHandler: SecurityHandlerContract
  let mockObserver: NetEventSecurityObserverContract
  let mockTransport: MockNetTransport
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

    mockTransport = new MockNetTransport()

    processor = new NetEventProcessor(
      mockPlayerService,
      mockSecurityHandler,
      mockObserver,
      mockTransport,
    )
  })

  it('should register event using INetTransport', () => {
    const onNetSpy = vi.spyOn(mockTransport, 'onNet')

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

    expect(onNetSpy).toHaveBeenCalledWith('test:event', expect.any(Function))
  })

  it('should use context.clientId instead of global source', async () => {
    const onNetSpy = vi.spyOn(mockTransport, 'onNet')

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

    expect(onNetSpy).toHaveBeenCalled()
    const registeredHandler = onNetSpy.mock.calls[0][1]

    await registeredHandler({ clientId: 123 })

    expect(mockPlayerService.getByClient).toHaveBeenCalledWith(123)

    expect(instance.handlerCalled).toBe(true)
    expect(instance.receivedPlayer).toBe(mockPlayer)
  })
})
