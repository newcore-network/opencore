import 'reflect-metadata'
import { describe, it, expect } from 'vitest'
import { Public } from '../../../../src/server/decorators/public'
import { METADATA_KEYS } from '../../../../src/server/system/metadata-server.keys'

describe('@Public decorator', () => {
  describe('metadata registration', () => {
    it('should set PUBLIC metadata to true', () => {
      class AuthController {
        @Public()
        login() {}
      }

      const metadata = Reflect.getMetadata(METADATA_KEYS.PUBLIC, AuthController.prototype, 'login')

      expect(metadata).toBe(true)
    })

    it('should allow checking if method is public', () => {
      class AuthController {
        @Public()
        publicMethod() {}

        privateMethod() {}
      }

      const isPublic = Reflect.getMetadata(
        METADATA_KEYS.PUBLIC,
        AuthController.prototype,
        'publicMethod',
      )

      const isPrivate = Reflect.getMetadata(
        METADATA_KEYS.PUBLIC,
        AuthController.prototype,
        'privateMethod',
      )

      expect(isPublic).toBe(true)
      expect(isPrivate).toBeUndefined()
    })
  })

  describe('multiple public methods', () => {
    it('should handle multiple @Public decorators', () => {
      class AuthController {
        @Public()
        login() {}

        @Public()
        register() {}

        @Public()
        forgotPassword() {}

        authenticatedMethod() {}
      }

      expect(Reflect.getMetadata(METADATA_KEYS.PUBLIC, AuthController.prototype, 'login')).toBe(
        true,
      )

      expect(Reflect.getMetadata(METADATA_KEYS.PUBLIC, AuthController.prototype, 'register')).toBe(
        true,
      )

      expect(
        Reflect.getMetadata(METADATA_KEYS.PUBLIC, AuthController.prototype, 'forgotPassword'),
      ).toBe(true)

      expect(
        Reflect.getMetadata(METADATA_KEYS.PUBLIC, AuthController.prototype, 'authenticatedMethod'),
      ).toBeUndefined()
    })
  })

  describe('method preservation', () => {
    it('should not modify original method', () => {
      class TestController {
        @Public()
        calculate(a: number, b: number) {
          return a + b
        }
      }

      const instance = new TestController()
      expect(instance.calculate(5, 3)).toBe(8)
    })

    it('should preserve async methods', async () => {
      class TestController {
        @Public()
        async fetchData() {
          return 'data'
        }
      }

      const instance = new TestController()
      const result = await instance.fetchData()
      expect(result).toBe('data')
    })

    it('should preserve this context', () => {
      class TestController {
        private value = 'context-value'

        @Public()
        getValue() {
          return this.value
        }
      }

      const instance = new TestController()
      expect(instance.getValue()).toBe('context-value')
    })
  })

  describe('combination with other decorators', () => {
    it('should work alongside @OnNet metadata', () => {
      // Simulating combined usage (without actually importing OnNet to avoid dependencies)
      class AuthController {
        @Public()
        login() {}
      }

      // Set some fake OnNet metadata
      Reflect.defineMetadata(
        'core:meta:net_event',
        { eventName: 'auth:login' },
        AuthController.prototype,
        'login',
      )

      const publicMeta = Reflect.getMetadata(
        METADATA_KEYS.PUBLIC,
        AuthController.prototype,
        'login',
      )
      const eventMeta = Reflect.getMetadata(
        'core:meta:net_event',
        AuthController.prototype,
        'login',
      )

      expect(publicMeta).toBe(true)
      expect(eventMeta.eventName).toBe('auth:login')
    })
  })

  describe('discovery patterns', () => {
    it('should support scanning for public methods', () => {
      class MixedController {
        @Public()
        public1() {}

        private1() {}

        @Public()
        public2() {}

        private2() {}
      }

      const prototype = MixedController.prototype
      const methods = Object.getOwnPropertyNames(prototype).filter(
        (name) => name !== 'constructor' && typeof (prototype as any)[name] === 'function',
      )

      const publicMethods = methods.filter(
        (method) => Reflect.getMetadata(METADATA_KEYS.PUBLIC, prototype, method) === true,
      )

      expect(publicMethods).toHaveLength(2)
      expect(publicMethods).toContain('public1')
      expect(publicMethods).toContain('public2')
    })

    it('should use hasMetadata for existence check', () => {
      class TestController {
        @Public()
        decorated() {}

        undecorated() {}
      }

      expect(Reflect.hasMetadata(METADATA_KEYS.PUBLIC, TestController.prototype, 'decorated')).toBe(
        true,
      )

      expect(
        Reflect.hasMetadata(METADATA_KEYS.PUBLIC, TestController.prototype, 'undecorated'),
      ).toBe(false)
    })
  })
})
