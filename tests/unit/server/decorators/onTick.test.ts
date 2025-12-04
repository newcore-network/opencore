// @ts-nocheck - Decorators use legacy format, tests pass correctly
import 'reflect-metadata'
import { describe, it, expect } from 'vitest'
import { OnTick } from '../../../../src/server/decorators/onTick'
import { METADATA_KEYS } from '../../../../src/server/system/metadata-server.keys'

describe('@OnTick decorator', () => {
  describe('metadata registration', () => {
    it('should register tick metadata', () => {
      class TickController {
        @OnTick()
        onTick() {}
      }

      const metadata = Reflect.getMetadata(
        METADATA_KEYS.TICK,
        TickController.prototype,
        'onTick',
      )

      expect(metadata).toBeDefined()
      expect(metadata).toEqual({})
    })

    it('should register metadata as empty object', () => {
      class TestController {
        @OnTick()
        tickHandler() {}
      }

      const metadata = Reflect.getMetadata(
        METADATA_KEYS.TICK,
        TestController.prototype,
        'tickHandler',
      )

      expect(typeof metadata).toBe('object')
      expect(Object.keys(metadata)).toHaveLength(0)
    })
  })

  describe('multiple tick handlers', () => {
    it('should allow multiple tick handlers in same controller', () => {
      class GameController {
        @OnTick()
        updatePlayers() {}

        @OnTick()
        updateVehicles() {}

        @OnTick()
        updateWorld() {}
      }

      expect(
        Reflect.hasMetadata(METADATA_KEYS.TICK, GameController.prototype, 'updatePlayers'),
      ).toBe(true)

      expect(
        Reflect.hasMetadata(METADATA_KEYS.TICK, GameController.prototype, 'updateVehicles'),
      ).toBe(true)

      expect(
        Reflect.hasMetadata(METADATA_KEYS.TICK, GameController.prototype, 'updateWorld'),
      ).toBe(true)
    })
  })

  describe('method preservation', () => {
    it('should not modify original method', () => {
      class TestController {
        private counter = 0

        @OnTick()
        increment() {
          this.counter++
          return this.counter
        }
      }

      const instance = new TestController()
      expect(instance.increment()).toBe(1)
      expect(instance.increment()).toBe(2)
      expect(instance.increment()).toBe(3)
    })

    it('should preserve async methods', async () => {
      class TestController {
        @OnTick()
        async fetchData() {
          return 'tick-data'
        }
      }

      const instance = new TestController()
      const result = await instance.fetchData()
      expect(result).toBe('tick-data')
    })

    it('should preserve this context', () => {
      class TestController {
        private value = 42

        @OnTick()
        getValue() {
          return this.value
        }
      }

      const instance = new TestController()
      expect(instance.getValue()).toBe(42)
    })
  })

  describe('metadata discovery', () => {
    it('should allow checking if method is a tick handler', () => {
      class TestController {
        @OnTick()
        tickMethod() {}

        normalMethod() {}
      }

      expect(
        Reflect.hasMetadata(METADATA_KEYS.TICK, TestController.prototype, 'tickMethod'),
      ).toBe(true)

      expect(
        Reflect.hasMetadata(METADATA_KEYS.TICK, TestController.prototype, 'normalMethod'),
      ).toBe(false)
    })

    it('should support scanning for all tick handlers', () => {
      class GameLoopController {
        @OnTick()
        tick1() {}

        helper() {}

        @OnTick()
        tick2() {}

        anotherHelper() {}

        @OnTick()
        tick3() {}
      }

      const prototype = GameLoopController.prototype
      const methods = Object.getOwnPropertyNames(prototype).filter(
        (name) => name !== 'constructor' && typeof (prototype as any)[name] === 'function',
      )

      const tickHandlers = methods.filter((method) =>
        Reflect.hasMetadata(METADATA_KEYS.TICK, prototype, method),
      )

      expect(tickHandlers).toHaveLength(3)
      expect(tickHandlers).toContain('tick1')
      expect(tickHandlers).toContain('tick2')
      expect(tickHandlers).toContain('tick3')
      expect(tickHandlers).not.toContain('helper')
      expect(tickHandlers).not.toContain('anotherHelper')
    })
  })

  describe('mixed with other decorators', () => {
    it('should work alongside other metadata', () => {
      class MixedController {
        @OnTick()
        tickHandler() {}
      }

      // Manually add some other metadata
      Reflect.defineMetadata('custom:meta', { value: 'test' }, MixedController.prototype, 'tickHandler')

      const tickMeta = Reflect.getMetadata(METADATA_KEYS.TICK, MixedController.prototype, 'tickHandler')
      const customMeta = Reflect.getMetadata('custom:meta', MixedController.prototype, 'tickHandler')

      expect(tickMeta).toEqual({})
      expect(customMeta).toEqual({ value: 'test' })
    })
  })
})

