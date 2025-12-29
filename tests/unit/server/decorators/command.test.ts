import 'reflect-metadata'
import { describe, expect, it } from 'vitest'
import { z } from 'zod'
import { Command, type CommandMetadata } from '../../../../src/runtime/server/decorators/command'
import { Public } from '../../../../src/runtime/server/decorators/public'
import { Player } from '../../../../src/runtime/server/entities/player'
import { METADATA_KEYS } from '../../../../src/runtime/server/system/metadata-server.keys'
import { createTestPlayer } from '../../../helpers'

describe('@Command decorator', () => {
  describe('string argument (simple usage)', () => {
    it('should register command with just a name', () => {
      class TestController {
        @Command('heal')
        handleHeal() {}
      }

      const metadata = Reflect.getMetadata(
        METADATA_KEYS.COMMAND,
        TestController.prototype,
        'handleHeal',
      ) as CommandMetadata

      expect(metadata).toBeDefined()
      expect(metadata.command).toBe('heal')
    })

    it('should set methodName correctly', () => {
      class TestController {
        @Command('teleport')
        goToLocation() {}
      }

      const metadata = Reflect.getMetadata(
        METADATA_KEYS.COMMAND,
        TestController.prototype,
        'goToLocation',
      ) as CommandMetadata

      expect(metadata.methodName).toBe('goToLocation')
    })

    it('should reference the correct target class', () => {
      class AdminController {
        @Command('ban')
        banPlayer() {}
      }

      const metadata = Reflect.getMetadata(
        METADATA_KEYS.COMMAND,
        AdminController.prototype,
        'banPlayer',
      ) as CommandMetadata

      expect(metadata.target).toBe(AdminController)
    })

    it('should not have description, usage, or schema by default', () => {
      class TestController {
        @Command('simple')
        simpleCommand() {}
      }

      const metadata = Reflect.getMetadata(
        METADATA_KEYS.COMMAND,
        TestController.prototype,
        'simpleCommand',
      ) as CommandMetadata

      expect(metadata.description).toBeUndefined()
      expect(metadata.usage).toBeUndefined()
      expect(metadata.schema).toBeUndefined()
    })
  })

  describe('object argument (full config)', () => {
    it('should register command with full configuration', () => {
      class TestController {
        @Command({
          command: 'deposit',
          description: 'Deposit money into your bank account',
          usage: '/deposit <amount>',
        })
        handleDeposit() {}
      }

      const metadata = Reflect.getMetadata(
        METADATA_KEYS.COMMAND,
        TestController.prototype,
        'handleDeposit',
      ) as CommandMetadata

      expect(metadata.command).toBe('deposit')
      expect(metadata.description).toBe('Deposit money into your bank account')
      expect(metadata.usage).toBe('/deposit <amount>')
    })

    it('should support schema validation', () => {
      const depositSchema = z.object({
        amount: z.number().positive(),
      })

      class BankController {
        @Command({
          command: 'withdraw',
          description: 'Withdraw money',
          schema: depositSchema,
        })
        handleWithdraw() {}
      }

      const metadata = Reflect.getMetadata(
        METADATA_KEYS.COMMAND,
        BankController.prototype,
        'handleWithdraw',
      ) as CommandMetadata

      expect(metadata.schema).toBe(depositSchema)
    })

    it('should allow partial configuration', () => {
      class TestController {
        @Command({
          command: 'kick',
          description: 'Kick a player from the server',
        })
        kickPlayer() {}
      }

      const metadata = Reflect.getMetadata(
        METADATA_KEYS.COMMAND,
        TestController.prototype,
        'kickPlayer',
      ) as CommandMetadata

      expect(metadata.command).toBe('kick')
      expect(metadata.description).toBe('Kick a player from the server')
      expect(metadata.usage).toBeUndefined()
      expect(metadata.schema).toBeUndefined()
    })
  })

  describe('multiple commands in same controller', () => {
    it('should handle multiple command decorators', () => {
      class AdminController {
        @Command('kick')
        kickPlayer() {}

        @Command({
          command: 'ban',
          description: 'Ban a player',
        })
        banPlayer() {}

        @Command({
          command: 'unban',
          description: 'Remove a ban',
          usage: '/unban <player_id>',
        })
        unbanPlayer() {}
      }

      const kickMeta = Reflect.getMetadata(
        METADATA_KEYS.COMMAND,
        AdminController.prototype,
        'kickPlayer',
      ) as CommandMetadata

      const banMeta = Reflect.getMetadata(
        METADATA_KEYS.COMMAND,
        AdminController.prototype,
        'banPlayer',
      ) as CommandMetadata

      const unbanMeta = Reflect.getMetadata(
        METADATA_KEYS.COMMAND,
        AdminController.prototype,
        'unbanPlayer',
      ) as CommandMetadata

      expect(kickMeta.command).toBe('kick')
      expect(banMeta.command).toBe('ban')
      expect(banMeta.description).toBe('Ban a player')
      expect(unbanMeta.command).toBe('unban')
      expect(unbanMeta.usage).toBe('/unban <player_id>')
    })

    it('should keep metadata isolated between commands', () => {
      const schemaA = z.object({ reason: z.string() })

      class ModerationController {
        @Command({ command: 'warn', schema: schemaA })
        warnPlayer() {}

        @Command('mute')
        mutePlayer() {}
      }

      const warnMeta = Reflect.getMetadata(
        METADATA_KEYS.COMMAND,
        ModerationController.prototype,
        'warnPlayer',
      ) as CommandMetadata

      const muteMeta = Reflect.getMetadata(
        METADATA_KEYS.COMMAND,
        ModerationController.prototype,
        'mutePlayer',
      ) as CommandMetadata

      expect(warnMeta.schema).toBe(schemaA)
      expect(muteMeta.schema).toBeUndefined()
    })
  })

  describe('method preservation', () => {
    it('should not modify the original method behavior', () => {
      class MathController {
        @Command('calculate')
        add(_player: Player, a: number, b: number) {
          return a + b
        }
      }

      const instance = new MathController()
      const fakePlayer = createTestPlayer()
      expect(instance.add(fakePlayer, 5, 3)).toBe(8)
    })

    it('should preserve async methods', async () => {
      class AsyncController {
        @Command('fetch')
        async fetchData() {
          return 'fetched'
        }
      }

      const instance = new AsyncController()
      const result = await instance.fetchData()
      expect(result).toBe('fetched')
    })

    it('should preserve this context', () => {
      class ContextController {
        private prefix = 'Result: '

        @Command('format')
        formatResult(_player: Player, value: string) {
          return this.prefix + value
        }
      }

      const instance = new ContextController()
      const fakePlayer = createTestPlayer()
      expect(instance.formatResult(fakePlayer, 'test')).toBe('Result: test')
    })
  })

  describe('metadata discovery', () => {
    it('should allow checking if method has @Command metadata', () => {
      class DiscoveryController {
        @Command('decorated')
        decoratedMethod() {}

        normalMethod() {}
      }

      const hasDecorated = Reflect.hasMetadata(
        METADATA_KEYS.COMMAND,
        DiscoveryController.prototype,
        'decoratedMethod',
      )

      const hasNormal = Reflect.hasMetadata(
        METADATA_KEYS.COMMAND,
        DiscoveryController.prototype,
        'normalMethod',
      )

      expect(hasDecorated).toBe(true)
      expect(hasNormal).toBe(false)
    })

    it('should support scanning for all commands in a controller', () => {
      class ScanController {
        @Command('first')
        first() {}

        helper() {}

        @Command('second')
        second() {}

        @Command('third')
        third() {}

        anotherHelper() {}
      }

      const prototype = ScanController.prototype
      const methods = Object.getOwnPropertyNames(prototype).filter(
        (name) => name !== 'constructor' && typeof (prototype as any)[name] === 'function',
      )

      const commands = methods
        .filter((method) => Reflect.hasMetadata(METADATA_KEYS.COMMAND, prototype, method))
        .map((method) => {
          const meta = Reflect.getMetadata(
            METADATA_KEYS.COMMAND,
            prototype,
            method,
          ) as CommandMetadata
          return meta.command
        })

      expect(commands).toHaveLength(3)
      expect(commands).toContain('first')
      expect(commands).toContain('second')
      expect(commands).toContain('third')
    })
  })

  describe('edge cases', () => {
    it('should handle command names with numbers', () => {
      class TestController {
        @Command('tp2')
        teleportToPosition2() {}
      }

      const metadata = Reflect.getMetadata(
        METADATA_KEYS.COMMAND,
        TestController.prototype,
        'teleportToPosition2',
      ) as CommandMetadata

      expect(metadata.command).toBe('tp2')
    })

    it('should handle long descriptions', () => {
      const longDescription =
        'This is a very long description that explains in detail what this command does, ' +
        'including all the parameters it accepts and the expected behavior when executed by different user types.'

      class TestController {
        @Command({ command: 'complex', description: longDescription })
        complexCommand() {}
      }

      const metadata = Reflect.getMetadata(
        METADATA_KEYS.COMMAND,
        TestController.prototype,
        'complexCommand',
      ) as CommandMetadata

      expect(metadata.description).toBe(longDescription)
    })

    it('should handle multiline usage strings', () => {
      const usage = `/command <arg1> <arg2>
  arg1: The first argument
  arg2: The second argument`

      class TestController {
        @Command({ command: 'multiline', usage })
        multilineCommand() {}
      }

      const metadata = Reflect.getMetadata(
        METADATA_KEYS.COMMAND,
        TestController.prototype,
        'multilineCommand',
      ) as CommandMetadata

      expect(metadata.usage).toBe(usage)
    })
  })
  describe('expectsPlayer + signature rules', () => {
    it('should set expectsPlayer=false when handler has no parameters', () => {
      class NoArgsController {
        @Command('ping')
        ping() {}
      }

      const metadata = Reflect.getMetadata(
        METADATA_KEYS.COMMAND,
        NoArgsController.prototype,
        'ping',
      ) as CommandMetadata

      expect(metadata.expectsPlayer).toBe(false)
    })

    it('should set expectsPlayer=true when first parameter is Player', () => {
      class PlayerOnlyController {
        whoami(_player: Player) {}
      }
      Reflect.defineMetadata(
        'design:paramtypes',
        [Player],
        PlayerOnlyController.prototype,
        'whoami',
      )
      const descriptor = Object.getOwnPropertyDescriptor(PlayerOnlyController.prototype, 'whoami')!
      Command('whoami')(PlayerOnlyController.prototype, 'whoami', descriptor as any)
      const metadata = Reflect.getMetadata(
        METADATA_KEYS.COMMAND,
        PlayerOnlyController.prototype,
        'whoami',
      ) as CommandMetadata
      expect(metadata.expectsPlayer).toBe(true)
    })

    it('should throw if handler has parameters and first is not Player', () => {
      class InvalidController {
        bad(_x: number) {}
      }
      Reflect.defineMetadata('design:paramtypes', [Number], InvalidController.prototype, 'bad')
      const descriptor = Object.getOwnPropertyDescriptor(InvalidController.prototype, 'bad')!
      expect(() => {
        Command('bad')(InvalidController.prototype, 'bad', descriptor as any)
      }).toThrow(/first parameter must be Player/i)
    })
  })

  describe('@Command with @Public', () => {
    it('should preserve @Public metadata when used with @Command', () => {
      class TestController {
        @Public()
        @Command('public-cmd')
        publicCommand(_player: Player) {}
      }

      const hasPublic = Reflect.getMetadata(
        METADATA_KEYS.PUBLIC,
        TestController.prototype,
        'publicCommand',
      )

      const commandMeta = Reflect.getMetadata(
        METADATA_KEYS.COMMAND,
        TestController.prototype,
        'publicCommand',
      ) as CommandMetadata

      expect(hasPublic).toBe(true)
      expect(commandMeta).toBeDefined()
      expect(commandMeta.command).toBe('public-cmd')
    })

    it('should not have @Public metadata by default', () => {
      class TestController {
        @Command('private-cmd')
        privateCommand(_player: Player) {}
      }

      const hasPublic = Reflect.getMetadata(
        METADATA_KEYS.PUBLIC,
        TestController.prototype,
        'privateCommand',
      )

      expect(hasPublic).toBeUndefined()
    })

    it('should work with full command config and @Public', () => {
      class TestController {
        @Public()
        @Command({
          command: 'help',
          description: 'Show help',
          usage: '/help',
        })
        helpCommand(_player: Player) {}
      }

      const hasPublic = Reflect.getMetadata(
        METADATA_KEYS.PUBLIC,
        TestController.prototype,
        'helpCommand',
      )

      const commandMeta = Reflect.getMetadata(
        METADATA_KEYS.COMMAND,
        TestController.prototype,
        'helpCommand',
      ) as CommandMetadata

      expect(hasPublic).toBe(true)
      expect(commandMeta.command).toBe('help')
      expect(commandMeta.description).toBe('Show help')
    })
  })
})
