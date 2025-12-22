// tests/unit/server/system/processors/netEvent.processor.test.ts
import 'reflect-metadata'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NetEventProcessor } from '../../../../../src/runtime/server/system/processors/netEvent.processor'

import { PlayerServiceContract } from '../../../../../src/runtime/server/services/contracts/player.service.contract'
import { SecurityHandlerContract } from '../../../../../src/runtime/server/templates/security/security-handler.contract'
import { NetEventSecurityObserverContract } from '../../../../../src/runtime/server/templates/security/net-event-security-observer.contract'
import { OnNet } from '../../../../../src/runtime/server/decorators/onNet'
import { METADATA_KEYS } from '../../../../../src/runtime/server/system/metadata-server.keys'
import { Player } from '../../../../../src/runtime/server/entities'
import { INetTransport, NetEventContext } from '../../../../../src/adapters'

class MockNetTransport extends INetTransport {
  onNet(
    _eventName: string,
    handler: (ctx: NetEventContext, ...args: any[]) => void | Promise<void>,
  ): void {}

  emitNet(_eventName: string, _target: number | 'all', ..._args: any[]): void {}
}

describe('NetEventProcessor', () => {
  let mockPlayerService: PlayerServiceContract
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
      handleTest(player: Player) {}
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
