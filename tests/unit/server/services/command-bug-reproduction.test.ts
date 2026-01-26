import 'reflect-metadata'
import { describe, expect, it, vi } from 'vitest'
import type { CommandMetadata } from '../../../../src/runtime/server/decorators/command'
import { Player } from '../../../../src/runtime/server/entities'
import { LocalCommandImplementation } from '../../../../src/runtime/server/implementations/local/command.local'
import { createTestPlayer } from '../../../helpers'

describe('Command Arguments - Spread Operator vs Array Parameter', () => {
  it('should flatten arguments when using spread operator (...args)', async () => {
    const service = new LocalCommandImplementation()
    const handler = vi.fn().mockImplementation((_player: Player, ...actions: string[]) => {
      return actions.join(' ')
    })

    // Simulates: meCommand(player: Server.Player, ...actions: string[])
    const meta: CommandMetadata = {
      command: 'me',
      methodName: 'handleMe',
      target: class Dummy {} as any,
      paramTypes: [Player, Array],
      paramNames: ['player', '...actions'],
      expectsPlayer: true,
      description: 'Me command',
      usage: 'Usage: /me [action]',
      schema: undefined,
      isPublic: true,
      hasSpreadParam: true, // Key difference: spread operator detected
    }

    service.register(meta, handler)

    const fakePlayer = createTestPlayer({ clientID: 1 })

    // Test with multiple arguments: /me hello world
    const result = await service.execute(fakePlayer, 'me', ['hello', 'world'])

    // Handler receives individual arguments: handler(player, 'hello', 'world')
    expect(result).toBe('hello world')
    expect(handler).toHaveBeenCalledWith(fakePlayer, 'hello', 'world')
  })

  it('should pass array as single argument when using array parameter (args: string[])', async () => {
    const service = new LocalCommandImplementation()
    const handler = vi.fn().mockImplementation((_player: Player, actions: string[]) => {
      return actions.join(' ')
    })

    // Simulates: doCommand(player: Server.Player, descriptions: string[])
    const meta: CommandMetadata = {
      command: 'do',
      methodName: 'handleDo',
      target: class Dummy {} as any,
      paramTypes: [Player, Array],
      paramNames: ['player', 'descriptions'],
      expectsPlayer: true,
      description: 'Do command',
      usage: 'Usage: /do [description]',
      schema: undefined,
      isPublic: true,
      hasSpreadParam: false, // Key difference: regular array parameter
    }

    service.register(meta, handler)

    const fakePlayer = createTestPlayer({ clientID: 1 })

    // Test with multiple arguments: /do hello world
    const result = await service.execute(fakePlayer, 'do', ['hello', 'world'])

    // Handler receives array as single argument: handler(player, ['hello', 'world'])
    expect(result).toBe('hello world')
    expect(handler).toHaveBeenCalledWith(fakePlayer, ['hello', 'world'])
  })

  it('should work with single argument using spread operator', async () => {
    const service = new LocalCommandImplementation()
    const handler = vi.fn().mockImplementation((_player: Player, ...actions: string[]) => {
      return actions.join(' ')
    })

    const meta: CommandMetadata = {
      command: 'me',
      methodName: 'handleMe',
      target: class Dummy {} as any,
      paramTypes: [Player, Array],
      paramNames: ['player', '...actions'],
      expectsPlayer: true,
      description: 'Me command',
      usage: 'Usage: /me [action]',
      schema: undefined,
      isPublic: true,
      hasSpreadParam: true,
    }

    service.register(meta, handler)

    const fakePlayer = createTestPlayer({ clientID: 1 })

    // Test with single argument: /me hello
    const result = await service.execute(fakePlayer, 'me', ['hello'])

    expect(result).toBe('hello')
    expect(handler).toHaveBeenCalledWith(fakePlayer, 'hello')
  })
})
