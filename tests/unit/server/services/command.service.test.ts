import 'reflect-metadata'
import { describe, it, expect, vi } from 'vitest'
import { CommandService } from '../../../../src/runtime/server/services/command.service'
import type { CommandMetadata } from '../../../../src/runtime/server/decorators/command'
import { Player } from '../../../../src/runtime/server'
import { AppError } from '../../../../src/kernel/utils'

describe('CommandService.execute', () => {
  it('should allow handler() when expectsPlayer=false and args are empty', async () => {
    const service = new CommandService()
    const handler = vi.fn().mockResolvedValue('ok')

    const meta: CommandMetadata = {
      command: 'ping',
      methodName: 'ping',
      target: class Dummy {} as any,
      paramTypes: [],
      paramNames: [],
      expectsPlayer: false,
      description: undefined,
      usage: '/ping',
      schema: undefined,
    }

    service.register(meta, handler)

    const fakePlayer = new Player({ clientID: 1, meta: {} } as any)

    const result = await service.execute(fakePlayer, 'ping', [])
    expect(result).toBe('ok')
    expect(handler).toHaveBeenCalledTimes(1)
    expect(handler).toHaveBeenCalledWith()
  })

  it('should reject args when expectsPlayer=false (handler() must not accept args)', async () => {
    const service = new CommandService()
    const handler = vi.fn().mockResolvedValue('ok')

    const meta: CommandMetadata = {
      command: 'ping',
      methodName: 'ping',
      target: class Dummy {} as any,
      paramTypes: [],
      paramNames: [],
      expectsPlayer: false,
      description: undefined,
      usage: '/ping',
      schema: undefined,
    }

    service.register(meta, handler)

    const fakePlayer = new Player({ clientID: 1, meta: {} } as any)

    await expect(service.execute(fakePlayer, 'ping', ['1'])).rejects.toBeInstanceOf(AppError)
    expect(handler).not.toHaveBeenCalled()
  })

  it('should allow handler(player) when expectsPlayer=true and no args', async () => {
    const service = new CommandService()
    const handler = vi.fn().mockResolvedValue('ok')

    const meta: CommandMetadata = {
      command: 'whoami',
      methodName: 'whoami',
      target: class Dummy {} as any,
      paramTypes: [Player],
      paramNames: ['player'],
      expectsPlayer: true,
      description: undefined,
      usage: '/whoami',
      schema: undefined,
    }

    service.register(meta, handler)

    const fakePlayer = new Player({ clientID: 1, meta: {} } as any)

    const result = await service.execute(fakePlayer, 'whoami', [])
    expect(result).toBe('ok')
    expect(handler).toHaveBeenCalledTimes(1)
    expect(handler).toHaveBeenCalledWith(fakePlayer)
  })

  it('should allow handler(player, a, b) and auto-validate/coerce args', async () => {
    const service = new CommandService()
    const handler = vi.fn().mockResolvedValue('ok')

    const meta: CommandMetadata = {
      command: 'add',
      methodName: 'add',
      target: class Dummy {} as any,
      paramTypes: [Player, Number, Number],
      paramNames: ['player', 'a', 'b'],
      expectsPlayer: true,
      description: undefined,
      usage: '/add <a> <b>',
      schema: undefined, // important: hit auto-schema path
    }

    service.register(meta, handler)

    const fakePlayer = new Player({ clientID: 1, meta: {} } as any)

    const result = await service.execute(fakePlayer, 'add', ['10', '5'])
    expect(result).toBe('ok')

    // Auto schema uses z.coerce.number() => should pass numbers to handler
    expect(handler).toHaveBeenCalledWith(fakePlayer, 10, 5)
  })
})
