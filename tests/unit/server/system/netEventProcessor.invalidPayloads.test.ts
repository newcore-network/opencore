import 'reflect-metadata'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { z } from 'zod'
import type { INetTransport, NetEventContext } from '../../../../src/adapters'
import { NodePlayerInfo } from '../../../../src/adapters/node/node-playerinfo'
import type { NetEventSecurityObserverContract } from '../../../../src/runtime/server/contracts/security/net-event-security-observer.contract'
import type { SecurityHandlerContract } from '../../../../src/runtime/server/contracts/security/security-handler.contract'
import { PlayerService } from '../../../../src/runtime/server/services/core/player.service'
import { NetEventProcessor } from '../../../../src/runtime/server/system/processors/netEvent.processor'
import { registeredNetEvents } from '../../../mocks/citizenfx'

const securityHandler: SecurityHandlerContract = {
  handleViolation: vi.fn().mockResolvedValue(undefined),
}

const observer: NetEventSecurityObserverContract = {
  onInvalidPayload: vi.fn().mockResolvedValue(undefined),
}

const netAbstract: INetTransport = {
  emitNet: vi.fn(),
  onNet: vi
    .fn()
    .mockImplementation(
      (
        eventName: string,
        handler: (ctx: NetEventContext, ...args: any[]) => void | Promise<void>,
      ) => {
        registeredNetEvents.set(eventName, handler)
      },
    ),
}

const playerInfo = new NodePlayerInfo()

describe('NetEventProcessor invalid payload resilience', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should not crash on repeated invalid payloads and should notify observer with incrementing counts', async () => {
    const playerService = new PlayerService(playerInfo)
    const player = playerService.bind(1)
    player.linkAccount('acc-1')

    const processor = new NetEventProcessor(playerService, securityHandler, observer, netAbstract)

    class TestController {
      async handle() {}
    }

    const schema = z.object({ a: z.string() })
    processor.process(new TestController(), 'handle', {
      eventName: 'test:event',
      schema,
      paramTypes: [],
    } as any)

    const fn = registeredNetEvents.get('test:event')
    expect(fn).toBeDefined()

    // Create context with clientId instead of using global.source
    const ctx: NetEventContext = { clientId: 1 }

    for (let i = 0; i < 10; i++) {
      await expect(fn!(ctx, { a: 123 })).resolves.toBeUndefined()
    }

    expect((observer.onInvalidPayload as any).mock.calls.length).toBe(10)
    expect((securityHandler.handleViolation as any).mock.calls.length).toBe(10)

    for (let i = 0; i < 10; i++) {
      const ctx = (observer.onInvalidPayload as any).mock.calls[i][1]
      expect(ctx.event).toBe('test:event')
      expect(ctx.playerId).toBe(1)
      expect(ctx.invalidCount).toBe(i + 1)
      expect(ctx.reason).toBe('zod')
      expect(Array.isArray(ctx.zodSummary)).toBe(true)
    }
  })

  it('should not crash even if handleViolation throws', async () => {
    const playerService = new PlayerService(playerInfo)
    const player = playerService.bind(1)
    player.linkAccount('acc-1')

    const processor = new NetEventProcessor(playerService, securityHandler, observer, netAbstract)

    class TestController {
      async handle() {}
    }

    const schema = z.object({ a: z.string() })
    processor.process(new TestController(), 'handle', {
      eventName: 'test:event:throws',
      schema,
      paramTypes: [],
    } as any)

    const fn = registeredNetEvents.get('test:event:throws')
    expect(fn).toBeDefined()

    // Create context with clientId instead of using global.source
    const ctx: NetEventContext = { clientId: 1 }

    await expect(fn!(ctx, { a: 123 })).resolves.toBeUndefined()
    expect((observer.onInvalidPayload as any).mock.calls.length).toBe(1)
  })
})
