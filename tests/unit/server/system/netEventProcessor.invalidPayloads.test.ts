import 'reflect-metadata'
import { describe, it, expect, vi } from 'vitest'
import { z } from 'zod'
import { registeredNetEvents } from '../../../mocks/citizenfx'
import { PlayerService } from '../../../../src/server/services/core/player.service'
import { NetEventProcessor } from '../../../../src/server/system/processors/netEvent.processor'
import { SecurityHandlerContract } from '../../../../src/server/templates/security/security-handler.contract'
import { NetEventSecurityObserverContract } from '../../../../src/server/templates/security/net-event-security-observer.contract'
import { INetTransport } from '../../../../src/server/capabilities/INetTransport'

describe('NetEventProcessor invalid payload resilience', () => {
  it('should not crash on repeated invalid payloads and should notify observer with incrementing counts', async () => {
    const playerService = new PlayerService()
    const player = playerService.bind(1)
    player.linkAccount('acc-1')

    const securityHandler: SecurityHandlerContract = {
      handleViolation: vi.fn().mockResolvedValue(undefined),
    }

    const observer: NetEventSecurityObserverContract = {
      onInvalidPayload: vi.fn().mockResolvedValue(undefined),
    }

    const netAbstract: INetTransport = {
      emitNet: vi.fn().mockResolvedValue(undefined),
      onNet: vi.fn().mockResolvedValue(undefined),
    }

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
    ;(global as any).source = 1

    for (let i = 0; i < 10; i++) {
      await expect(fn!({ a: 123 })).resolves.toBeUndefined()
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
    const playerService = new PlayerService()
    const player = playerService.bind(1)
    player.linkAccount('acc-1')

    const securityHandler: SecurityHandlerContract = {
      handleViolation: vi.fn().mockRejectedValue(new Error('boom')),
    } as any

    const observer: NetEventSecurityObserverContract = {
      onInvalidPayload: vi.fn().mockResolvedValue(undefined),
    } as any

    const netAbstract: INetTransport = {
      emitNet: vi.fn().mockResolvedValue(undefined),
      onNet: vi.fn().mockResolvedValue(undefined),
    }

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
    ;(global as any).source = 1

    await expect(fn!({ a: 123 })).resolves.toBeUndefined()
    expect((observer.onInvalidPayload as any).mock.calls.length).toBe(1)
  })
})
