// @ts-nocheck - Decorators use legacy format, tests pass correctly
import 'reflect-metadata'
import { describe, it, expect } from 'vitest'
import { z } from 'zod'
import { OnNet, type NetEventOptions } from '../../../../src/server/decorators/netEvent'
import { METADATA_KEYS } from '../../../../src/server/system/metadata-server.keys'

describe('@OnNet decorator', () => {
  describe('basic metadata registration', () => {
    it('should register event name in metadata', () => {
      class TestController {
        @OnNet('player:spawn')
        handleSpawn() {}
      }

      const metadata = Reflect.getMetadata(
        METADATA_KEYS.NET_EVENT,
        TestController.prototype,
        'handleSpawn',
      ) as NetEventOptions

      expect(metadata).toBeDefined()
      expect(metadata.eventName).toBe('player:spawn')
    })

    it('should support namespaced event names', () => {
      class TestController {
        @OnNet('auth:login:attempt')
        handleLogin() {}
      }

      const metadata = Reflect.getMetadata(
        METADATA_KEYS.NET_EVENT,
        TestController.prototype,
        'handleLogin',
      ) as NetEventOptions

      expect(metadata.eventName).toBe('auth:login:attempt')
    })

    it('should support simple event names', () => {
      class TestController {
        @OnNet('ping')
        handlePing() {}
      }

      const metadata = Reflect.getMetadata(
        METADATA_KEYS.NET_EVENT,
        TestController.prototype,
        'handlePing',
      ) as NetEventOptions

      expect(metadata.eventName).toBe('ping')
    })
  })

  describe('schema validation support', () => {
    it('should store schema when provided', () => {
      const loginSchema = z.object({
        username: z.string(),
        password: z.string(),
      })

      class AuthController {
        @OnNet('auth:login', loginSchema)
        handleLogin(_player: any, _data: z.infer<typeof loginSchema>) {}
      }

      const metadata = Reflect.getMetadata(
        METADATA_KEYS.NET_EVENT,
        AuthController.prototype,
        'handleLogin',
      ) as NetEventOptions

      expect(metadata.schema).toBeDefined()
      expect(metadata.schema).toBe(loginSchema)
    })

    it('should leave schema undefined when not provided', () => {
      class TestController {
        @OnNet('test:event')
        handleTest() {}
      }

      const metadata = Reflect.getMetadata(
        METADATA_KEYS.NET_EVENT,
        TestController.prototype,
        'handleTest',
      ) as NetEventOptions

      expect(metadata.schema).toBeUndefined()
    })

    it('should work with complex schemas', () => {
      const complexSchema = z.object({
        user: z.object({
          id: z.number(),
          name: z.string(),
        }),
        items: z.array(z.string()),
        metadata: z.record(z.unknown()).optional(),
      })

      class InventoryController {
        @OnNet('inventory:update', complexSchema)
        handleUpdate() {}
      }

      const metadata = Reflect.getMetadata(
        METADATA_KEYS.NET_EVENT,
        InventoryController.prototype,
        'handleUpdate',
      ) as NetEventOptions

      expect(metadata.schema).toBe(complexSchema)

      // Verify schema works correctly
      const validData = {
        user: { id: 1, name: 'Test' },
        items: ['item1', 'item2'],
      }
      expect(() => complexSchema.parse(validData)).not.toThrow()
    })
  })

  describe('multiple events on same controller', () => {
    it('should allow multiple @OnNet decorators on different methods', () => {
      class MultiEventController {
        @OnNet('event:first')
        handleFirst() {}

        @OnNet('event:second')
        handleSecond() {}

        @OnNet('event:third')
        handleThird() {}
      }

      const firstMeta = Reflect.getMetadata(
        METADATA_KEYS.NET_EVENT,
        MultiEventController.prototype,
        'handleFirst',
      ) as NetEventOptions

      const secondMeta = Reflect.getMetadata(
        METADATA_KEYS.NET_EVENT,
        MultiEventController.prototype,
        'handleSecond',
      ) as NetEventOptions

      const thirdMeta = Reflect.getMetadata(
        METADATA_KEYS.NET_EVENT,
        MultiEventController.prototype,
        'handleThird',
      ) as NetEventOptions

      expect(firstMeta.eventName).toBe('event:first')
      expect(secondMeta.eventName).toBe('event:second')
      expect(thirdMeta.eventName).toBe('event:third')
    })

    it('should keep metadata isolated between methods', () => {
      const schemaA = z.object({ a: z.string() })
      const schemaB = z.object({ b: z.number() })

      class IsolatedController {
        @OnNet('isolated:a', schemaA)
        methodA() {}

        @OnNet('isolated:b', schemaB)
        methodB() {}

        @OnNet('isolated:c')
        methodC() {}
      }

      const metaA = Reflect.getMetadata(
        METADATA_KEYS.NET_EVENT,
        IsolatedController.prototype,
        'methodA',
      ) as NetEventOptions

      const metaB = Reflect.getMetadata(
        METADATA_KEYS.NET_EVENT,
        IsolatedController.prototype,
        'methodB',
      ) as NetEventOptions

      const metaC = Reflect.getMetadata(
        METADATA_KEYS.NET_EVENT,
        IsolatedController.prototype,
        'methodC',
      ) as NetEventOptions

      expect(metaA.schema).toBe(schemaA)
      expect(metaB.schema).toBe(schemaB)
      expect(metaC.schema).toBeUndefined()
    })
  })

  describe('method preservation', () => {
    it('should not modify the original method', () => {
      class PreservationController {
        @OnNet('test:preserve')
        calculate(x: number, y: number) {
          return x + y
        }
      }

      const instance = new PreservationController()
      const result = instance.calculate(5, 3)

      expect(result).toBe(8)
    })

    it('should preserve async methods', async () => {
      class AsyncController {
        @OnNet('test:async')
        async fetchData() {
          return Promise.resolve('async-result')
        }
      }

      const instance = new AsyncController()
      const result = await instance.fetchData()

      expect(result).toBe('async-result')
    })

    it('should preserve method context (this)', () => {
      class ContextController {
        private value = 'context-value'

        @OnNet('test:context')
        getValue() {
          return this.value
        }
      }

      const instance = new ContextController()
      const result = instance.getValue()

      expect(result).toBe('context-value')
    })
  })

  describe('metadata retrieval patterns', () => {
    it('should allow checking if method has @OnNet metadata', () => {
      class CheckController {
        @OnNet('check:decorated')
        decoratedMethod() {}

        normalMethod() {}
      }

      const hasDecorated = Reflect.hasMetadata(
        METADATA_KEYS.NET_EVENT,
        CheckController.prototype,
        'decoratedMethod',
      )

      const hasNormal = Reflect.hasMetadata(
        METADATA_KEYS.NET_EVENT,
        CheckController.prototype,
        'normalMethod',
      )

      expect(hasDecorated).toBe(true)
      expect(hasNormal).toBe(false)
    })

    it('should support iterating over all methods to find decorated ones', () => {
      class IterableController {
        @OnNet('iter:first')
        first() {}

        notDecorated() {}

        @OnNet('iter:second')
        second() {}

        alsoNotDecorated() {}

        @OnNet('iter:third')
        third() {}
      }

      const prototype = IterableController.prototype
      const methods = Object.getOwnPropertyNames(prototype).filter(
        (name) => name !== 'constructor' && typeof (prototype as any)[name] === 'function',
      )

      const decoratedMethods = methods.filter((method) =>
        Reflect.hasMetadata(METADATA_KEYS.NET_EVENT, prototype, method),
      )

      expect(decoratedMethods).toHaveLength(3)
      expect(decoratedMethods).toContain('first')
      expect(decoratedMethods).toContain('second')
      expect(decoratedMethods).toContain('third')
      expect(decoratedMethods).not.toContain('notDecorated')
      expect(decoratedMethods).not.toContain('alsoNotDecorated')
    })
  })

  describe('edge cases', () => {
    it('should handle empty event name', () => {
      class EmptyNameController {
        @OnNet('')
        handleEmpty() {}
      }

      const metadata = Reflect.getMetadata(
        METADATA_KEYS.NET_EVENT,
        EmptyNameController.prototype,
        'handleEmpty',
      ) as NetEventOptions

      expect(metadata.eventName).toBe('')
    })

    it('should handle event names with special characters', () => {
      class SpecialController {
        @OnNet('event:with-dash_and_underscore.and.dots')
        handleSpecial() {}
      }

      const metadata = Reflect.getMetadata(
        METADATA_KEYS.NET_EVENT,
        SpecialController.prototype,
        'handleSpecial',
      ) as NetEventOptions

      expect(metadata.eventName).toBe('event:with-dash_and_underscore.and.dots')
    })
  })
})

