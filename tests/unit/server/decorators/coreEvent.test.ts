// @ts-nocheck - Decorators use legacy format, tests pass correctly
import 'reflect-metadata'
import { describe, it, expect } from 'vitest'
import { METADATA_KEYS } from '../../../../src/runtime/server/system/metadata-server.keys'
import { OnFrameworkEvent } from '../../../../src/runtime/server/decorators/onFrameworkEvent'

describe('@OnFrameworkEvent decorator', () => {
  describe('event registration', () => {
    it('should register playerConnecting event', () => {
      class SessionController {
        @OnFrameworkEvent('playerConnecting')
        handleConnecting() {}
      }

      const metadata = Reflect.getMetadata(
        METADATA_KEYS.CORE_EVENT,
        SessionController.prototype,
        'handleConnecting',
      )

      expect(metadata).toBeDefined()
      expect(metadata.event).toBe('playerConnecting')
    })

    it('should register playerDropped event', () => {
      class SessionController {
        @OnFrameworkEvent('playerDropped')
        handleDropped() {}
      }

      const metadata = Reflect.getMetadata(
        METADATA_KEYS.CORE_EVENT,
        SessionController.prototype,
        'handleDropped',
      )

      expect(metadata.event).toBe('playerDropped')
    })

    it('should register playerSessionCreated event', () => {
      class SessionController {
        @OnFrameworkEvent('playerSessionCreated')
        handleSessionCreated() {}
      }

      const metadata = Reflect.getMetadata(
        METADATA_KEYS.CORE_EVENT,
        SessionController.prototype,
        'handleSessionCreated',
      )

      expect(metadata.event).toBe('playerSessionCreated')
    })
  })

  describe('multiple handlers', () => {
    it('should allow multiple core event handlers in same controller', () => {
      class LifecycleController {
        @OnFrameworkEvent('playerConnecting')
        onConnect() {}

        @OnFrameworkEvent('playerDropped')
        onDrop() {}

        @OnFrameworkEvent('playerSessionCreated')
        onSession() {}
      }

      const connectMeta = Reflect.getMetadata(
        METADATA_KEYS.CORE_EVENT,
        LifecycleController.prototype,
        'onConnect',
      )

      const dropMeta = Reflect.getMetadata(
        METADATA_KEYS.CORE_EVENT,
        LifecycleController.prototype,
        'onDrop',
      )

      const sessionMeta = Reflect.getMetadata(
        METADATA_KEYS.CORE_EVENT,
        LifecycleController.prototype,
        'onSession',
      )

      expect(connectMeta.event).toBe('playerConnecting')
      expect(dropMeta.event).toBe('playerDropped')
      expect(sessionMeta.event).toBe('playerSessionCreated')
    })

    it('should keep metadata isolated between methods', () => {
      class TestController {
        @OnFrameworkEvent('playerConnecting')
        method1() {}

        @OnFrameworkEvent('playerDropped')
        method2() {}
      }

      const meta1 = Reflect.getMetadata(
        METADATA_KEYS.CORE_EVENT,
        TestController.prototype,
        'method1',
      )

      const meta2 = Reflect.getMetadata(
        METADATA_KEYS.CORE_EVENT,
        TestController.prototype,
        'method2',
      )

      expect(meta1.event).not.toBe(meta2.event)
    })
  })

  describe('method preservation', () => {
    it('should not modify original method', () => {
      class TestController {
        @OnFrameworkEvent('playerConnecting')
        calculate(a: number, b: number) {
          return a + b
        }
      }

      const instance = new TestController()
      expect(instance.calculate(5, 3)).toBe(8)
    })

    it('should preserve async methods', async () => {
      class TestController {
        @OnFrameworkEvent('playerSessionCreated')
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
        private prefix = 'Player: '

        @OnFrameworkEvent('playerConnecting')
        formatPlayer(name: string) {
          return this.prefix + name
        }
      }

      const instance = new TestController()
      expect(instance.formatPlayer('John')).toBe('Player: John')
    })
  })

  describe('metadata discovery', () => {
    it('should allow checking if method handles core event', () => {
      class TestController {
        @OnFrameworkEvent('playerConnecting')
        decorated() {}

        normal() {}
      }

      expect(
        Reflect.hasMetadata(METADATA_KEYS.CORE_EVENT, TestController.prototype, 'decorated'),
      ).toBe(true)

      expect(
        Reflect.hasMetadata(METADATA_KEYS.CORE_EVENT, TestController.prototype, 'normal'),
      ).toBe(false)
    })

    it('should support scanning for all core event handlers', () => {
      class EventController {
        @OnFrameworkEvent('playerConnecting')
        onConnect() {}

        helper() {}

        @OnFrameworkEvent('playerDropped')
        onDrop() {}

        anotherHelper() {}
      }

      const prototype = EventController.prototype
      const methods = Object.getOwnPropertyNames(prototype).filter(
        (name) => name !== 'constructor' && typeof (prototype as any)[name] === 'function',
      )

      const handlers = methods
        .filter((method) => Reflect.hasMetadata(METADATA_KEYS.CORE_EVENT, prototype, method))
        .map((method) => {
          const meta = Reflect.getMetadata(METADATA_KEYS.CORE_EVENT, prototype, method)
          return { method, event: meta.event }
        })

      expect(handlers).toHaveLength(2)
      expect(handlers).toContainEqual({ method: 'onConnect', event: 'playerConnecting' })
      expect(handlers).toContainEqual({ method: 'onDrop', event: 'playerDropped' })
    })
  })
})
