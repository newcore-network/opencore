import 'reflect-metadata'
import { describe, it, expect, vi } from 'vitest'
import { CommandService } from '../../../../src/runtime/server/services/core/command.service'
import type { CommandMetadata } from '../../../../src/runtime/server/decorators/command'
import { Player } from '../../../../src/runtime/server'
import { AppError } from '../../../../src/kernel/utils'
import { createTestPlayer, createAuthenticatedPlayer } from '../../../helpers'

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
      isPublic: true, // Mark as public for testing
    }

    service.register(meta, handler)

    const fakePlayer = createTestPlayer({ clientID: 1 })

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
      isPublic: true, // Mark as public for testing
    }

    service.register(meta, handler)

    const fakePlayer = createTestPlayer({ clientID: 1 })

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
      isPublic: true, // Mark as public for testing
    }

    service.register(meta, handler)

    const fakePlayer = createTestPlayer({ clientID: 1 })

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
      isPublic: true, // Mark as public for testing
    }

    service.register(meta, handler)

    const fakePlayer = createTestPlayer({ clientID: 1 })

    const result = await service.execute(fakePlayer, 'add', ['10', '5'])
    expect(result).toBe('ok')

    // Auto schema uses z.coerce.number() => should pass numbers to handler
    expect(handler).toHaveBeenCalledWith(fakePlayer, 10, 5)
  })
})

describe('CommandService - Authentication', () => {
  it('should block unauthenticated player on non-public command', async () => {
    const service = new CommandService()
    const handler = vi.fn().mockResolvedValue('ok')

    const meta: CommandMetadata = {
      command: 'spawn',
      methodName: 'spawn',
      target: class Dummy {} as any,
      paramTypes: [Player, String],
      paramNames: ['player', 'model'],
      expectsPlayer: true,
      description: 'Spawn a vehicle',
      usage: '/spawn <model>',
      schema: undefined,
      isPublic: false,
    }

    service.register(meta, handler)

    // Create player without accountID (unauthenticated)
    const fakePlayer = createTestPlayer({ clientID: 1 })
    fakePlayer.emit = vi.fn()
    fakePlayer.send = vi.fn()

    await service.execute(fakePlayer, 'spawn', ['car'])

    // Handler should not be called
    expect(handler).not.toHaveBeenCalled()

    // Should emit auth required event
    expect(fakePlayer.emit).toHaveBeenCalledWith('core:auth:required', { command: 'spawn' })

    // Should send error message
    expect(fakePlayer.send).toHaveBeenCalledWith(
      'You must be authenticated to use this command',
      'error',
    )
  })

  it('should allow authenticated player on non-public command', async () => {
    const service = new CommandService()
    const handler = vi.fn().mockResolvedValue('ok')

    const meta: CommandMetadata = {
      command: 'spawn',
      methodName: 'spawn',
      target: class Dummy {} as any,
      paramTypes: [Player, String],
      paramNames: ['player', 'model'],
      expectsPlayer: true,
      description: 'Spawn a vehicle',
      usage: '/spawn <model>',
      schema: undefined,
      isPublic: false,
    }

    service.register(meta, handler)

    // Create player with accountID (authenticated)
    const fakePlayer = createAuthenticatedPlayer('account-123', { clientID: 1 })

    const result = await service.execute(fakePlayer, 'spawn', ['car'])

    // Handler should be called
    expect(result).toBe('ok')
    expect(handler).toHaveBeenCalledWith(fakePlayer, 'car')
  })

  it('should allow unauthenticated player on @Public command', async () => {
    const service = new CommandService()
    const handler = vi.fn().mockResolvedValue('pong')

    const meta: CommandMetadata = {
      command: 'ping',
      methodName: 'ping',
      target: class Dummy {} as any,
      paramTypes: [Player],
      paramNames: ['player'],
      expectsPlayer: true,
      description: 'Ping command',
      usage: '/ping',
      schema: undefined,
      isPublic: true, // Marked as public
    }

    service.register(meta, handler)

    // Create player without accountID (unauthenticated)
    const fakePlayer = createTestPlayer({ clientID: 1 })
    fakePlayer.emit = vi.fn()
    fakePlayer.send = vi.fn()

    const result = await service.execute(fakePlayer, 'ping', [])

    // Handler should be called
    expect(result).toBe('pong')
    expect(handler).toHaveBeenCalledWith(fakePlayer)

    // Should not emit auth required
    expect(fakePlayer.emit).not.toHaveBeenCalled()
    expect(fakePlayer.send).not.toHaveBeenCalled()
  })

  it('should allow authenticated player on @Public command', async () => {
    const service = new CommandService()
    const handler = vi.fn().mockResolvedValue('pong')

    const meta: CommandMetadata = {
      command: 'ping',
      methodName: 'ping',
      target: class Dummy {} as any,
      paramTypes: [Player],
      paramNames: ['player'],
      expectsPlayer: true,
      description: 'Ping command',
      usage: '/ping',
      schema: undefined,
      isPublic: true,
    }

    service.register(meta, handler)

    // Create player with accountID (authenticated)
    const fakePlayer = createAuthenticatedPlayer('account-456', { clientID: 1 })

    const result = await service.execute(fakePlayer, 'ping', [])

    // Handler should be called
    expect(result).toBe('pong')
    expect(handler).toHaveBeenCalledWith(fakePlayer)
  })

  it('should include isPublic in getAllCommands() output', () => {
    const service = new CommandService()

    const publicMeta: CommandMetadata = {
      command: 'help',
      methodName: 'help',
      target: class Dummy {} as any,
      paramTypes: [Player],
      paramNames: ['player'],
      expectsPlayer: true,
      description: 'Show help',
      usage: '/help',
      schema: undefined,
      isPublic: true,
    }

    const privateMeta: CommandMetadata = {
      command: 'admin',
      methodName: 'admin',
      target: class Dummy {} as any,
      paramTypes: [Player],
      paramNames: ['player'],
      expectsPlayer: true,
      description: 'Admin command',
      usage: '/admin',
      schema: undefined,
      isPublic: false,
    }

    service.register(publicMeta, vi.fn())
    service.register(privateMeta, vi.fn())

    const commands = service.getAllCommands()

    expect(commands).toHaveLength(2)
    expect(commands.find((c) => c.command === 'help')?.isPublic).toBe(true)
    expect(commands.find((c) => c.command === 'admin')?.isPublic).toBe(false)
  })
})
