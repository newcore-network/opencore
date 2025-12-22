import 'reflect-metadata'
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { container } from 'tsyringe'
import { Guard, type GuardOptions } from '../../../../src/runtime/server/decorators/guard'
import { AccessControlService } from '../../../../src/runtime/server/services/access-control.service'

// Mock player type
interface MockPlayer {
  clientID: number
  name: string
}

describe('@Guard decorator', () => {
  describe('metadata registration', () => {
    it('should register guard options in metadata', () => {
      class TestController {
        @Guard({ rank: 5 })
        adminMethod() {}
      }

      const metadata = Reflect.getMetadata(
        'core:guard',
        TestController.prototype,
        'adminMethod',
      ) as GuardOptions

      expect(metadata).toBeDefined()
      expect(metadata.rank).toBe(5)
    })

    it('should register permission-based guard', () => {
      class TestController {
        @Guard({ permission: 'admin.ban' })
        banPlayer() {}
      }

      const metadata = Reflect.getMetadata(
        'core:guard',
        TestController.prototype,
        'banPlayer',
      ) as GuardOptions

      expect(metadata.permission).toBe('admin.ban')
    })

    it('should register combined rank and permission guard', () => {
      class TestController {
        @Guard({ rank: 10, permission: 'superadmin.execute' })
        superAdminAction() {}
      }

      const metadata = Reflect.getMetadata(
        'core:guard',
        TestController.prototype,
        'superAdminAction',
      ) as GuardOptions

      expect(metadata.rank).toBe(10)
      expect(metadata.permission).toBe('superadmin.execute')
    })

    it('should register empty guard options', () => {
      class TestController {
        @Guard({})
        noRequirements() {}
      }

      const metadata = Reflect.getMetadata(
        'core:guard',
        TestController.prototype,
        'noRequirements',
      ) as GuardOptions

      expect(metadata).toBeDefined()
      expect(metadata.rank).toBeUndefined()
      expect(metadata.permission).toBeUndefined()
    })
  })

  describe('multiple guards in same controller', () => {
    it('should register different guards on different methods', () => {
      class AdminController {
        @Guard({ rank: 5 })
        modAction() {}

        @Guard({ rank: 10 })
        adminAction() {}

        @Guard({ permission: 'super.access' })
        superAction() {}
      }

      const modMeta = Reflect.getMetadata(
        'core:guard',
        AdminController.prototype,
        'modAction',
      ) as GuardOptions

      const adminMeta = Reflect.getMetadata(
        'core:guard',
        AdminController.prototype,
        'adminAction',
      ) as GuardOptions

      const superMeta = Reflect.getMetadata(
        'core:guard',
        AdminController.prototype,
        'superAction',
      ) as GuardOptions

      expect(modMeta.rank).toBe(5)
      expect(adminMeta.rank).toBe(10)
      expect(superMeta.permission).toBe('super.access')
    })

    it('should keep guard metadata isolated between methods', () => {
      class TestController {
        @Guard({ rank: 100, permission: 'owner' })
        method1() {}

        @Guard({ rank: 1 })
        method2() {}
      }

      const meta1 = Reflect.getMetadata(
        'core:guard',
        TestController.prototype,
        'method1',
      ) as GuardOptions

      const meta2 = Reflect.getMetadata(
        'core:guard',
        TestController.prototype,
        'method2',
      ) as GuardOptions

      expect(meta1.rank).toBe(100)
      expect(meta1.permission).toBe('owner')
      expect(meta2.rank).toBe(1)
      expect(meta2.permission).toBeUndefined()
    })
  })

  describe('error handling for invalid player', () => {
    // Mock AccessControlService to bypass DI issues
    beforeEach(() => {
      container.clearInstances()

      // Create a mock AccessControlService
      const mockAccessControl = {
        enforce: vi.fn().mockResolvedValue(undefined),
        hasRank: vi.fn().mockResolvedValue(true),
        hasPermission: vi.fn().mockResolvedValue(true),
      }

      container.registerInstance(AccessControlService, mockAccessControl as any)
    })

    it('should throw when first argument is null', async () => {
      class TestController {
        @Guard({ rank: 1 })
        guardedMethod() {
          return 'should-not-reach'
        }
      }

      const instance = new TestController()

      await expect(instance.guardedMethod.call(instance)).rejects.toThrow('Guard Security Error')
    })

    it('should throw when first argument is undefined', async () => {
      class TestController {
        @Guard({ rank: 1 })
        guardedMethod() {
          return 'should-not-reach'
        }
      }

      const instance = new TestController()

      await expect(instance.guardedMethod.call(instance)).rejects.toThrow('Guard Security Error')
    })

    it('should throw when first argument has no clientID', async () => {
      class TestController {
        @Guard({ rank: 1 })
        guardedMethod() {
          return 'should-not-reach'
        }
      }

      const instance = new TestController()
      const invalidPlayer = { name: 'NoClientID' }

      await expect(instance.guardedMethod.call(instance)).rejects.toThrow('Guard Security Error')
    })
  })

  describe('method wrapping', () => {
    beforeEach(() => {
      container.clearInstances()

      const mockAccessControl = {
        enforce: vi.fn().mockResolvedValue(undefined),
      }

      container.registerInstance(AccessControlService, mockAccessControl as any)
    })

    it('should call original method after guard passes', async () => {
      class TestController {
        @Guard({ rank: 1 })
        protectedAction(_player: MockPlayer) {
          return 'action-result'
        }
      }

      const player: MockPlayer = { clientID: 1, name: 'Player' }
      const instance = new TestController()

      const result = await instance.protectedAction.call(instance, player)
      expect(result).toBe('action-result')
    })

    it('should pass all arguments to original method', async () => {
      class TestController {
        @Guard({ rank: 1 })
        processData(_player: MockPlayer, arg1: string, arg2: number) {
          return { arg1, arg2 }
        }
      }

      const player: MockPlayer = { clientID: 1, name: 'Player' }
      const instance = new TestController()

      const result = await instance.processData.call(instance, player, 'hello', 42)
      expect(result).toEqual({ arg1: 'hello', arg2: 42 })
    })

    it('should preserve this context', async () => {
      class TestController {
        private prefix = 'Result: '

        @Guard({ rank: 1 })
        formatResult(_player: MockPlayer, value: string) {
          return this.prefix + value
        }
      }

      const player: MockPlayer = { clientID: 1, name: 'Player' }
      const instance = new TestController()

      const result = await instance.formatResult.call(instance, player, 'test')
      expect(result).toBe('Result: test')
    })

    it('should handle async methods', async () => {
      class TestController {
        @Guard({ rank: 1 })
        async fetchData(_player: MockPlayer) {
          await new Promise((r) => setTimeout(r, 10))
          return 'async-data'
        }
      }

      const player: MockPlayer = { clientID: 1, name: 'Player' }
      const instance = new TestController()

      const result = await instance.fetchData.call(instance, player)
      expect(result).toBe('async-data')
    })
  })

  describe('guard metadata discovery', () => {
    it('should allow checking if method has guard', () => {
      class TestController {
        @Guard({ rank: 5 })
        guarded() {}

        unguarded() {}
      }

      expect(Reflect.hasMetadata('core:guard', TestController.prototype, 'guarded')).toBe(true)

      expect(Reflect.hasMetadata('core:guard', TestController.prototype, 'unguarded')).toBe(false)
    })

    it('should support scanning for all guarded methods', () => {
      class SecurityController {
        @Guard({ rank: 10 })
        adminOnly() {}

        publicMethod() {}

        @Guard({ permission: 'mod.kick' })
        modAction() {}

        anotherPublic() {}

        @Guard({ rank: 5, permission: 'special' })
        specialAction() {}
      }

      const prototype = SecurityController.prototype
      const methods = Object.getOwnPropertyNames(prototype).filter(
        (name) => name !== 'constructor' && typeof (prototype as any)[name] === 'function',
      )

      const guardedMethods = methods.filter((method) =>
        Reflect.hasMetadata('core:guard', prototype, method),
      )

      expect(guardedMethods).toHaveLength(3)
      expect(guardedMethods).toContain('adminOnly')
      expect(guardedMethods).toContain('modAction')
      expect(guardedMethods).toContain('specialAction')
      expect(guardedMethods).not.toContain('publicMethod')
      expect(guardedMethods).not.toContain('anotherPublic')
    })
  })
})
