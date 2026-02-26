import 'reflect-metadata'
import { describe, expect, it } from 'vitest'
import {
  BinaryEvent,
  type BinaryEventMetadata,
} from '../../../../src/runtime/server/decorators/binaryEvent'
import { METADATA_KEYS } from '../../../../src/runtime/server/system/metadata-server.keys'

describe('@BinaryEvent decorator', () => {
  describe('metadata registration', () => {
    it('should store BINARY_EVENT metadata with event defaulting to method name', () => {
      class TestService {
        @BinaryEvent()
        onDetection() {}
      }

      const metadata = Reflect.getMetadata(
        METADATA_KEYS.BINARY_EVENT,
        TestService.prototype,
        'onDetection',
      ) as BinaryEventMetadata

      expect(metadata).toBeDefined()
      expect(metadata.methodName).toBe('onDetection')
      expect(metadata.event).toBe('onDetection')
      expect(metadata.service).toBeUndefined()
    })

    it('should respect event name override', () => {
      class TestService {
        @BinaryEvent({ event: 'file:changed' })
        handleFileChange() {}
      }

      const metadata = Reflect.getMetadata(
        METADATA_KEYS.BINARY_EVENT,
        TestService.prototype,
        'handleFileChange',
      ) as BinaryEventMetadata

      expect(metadata.event).toBe('file:changed')
      expect(metadata.methodName).toBe('handleFileChange')
    })

    it('should respect service option', () => {
      class TestService {
        @BinaryEvent({ service: 'other-binary' })
        onExternalEvent() {}
      }

      const metadata = Reflect.getMetadata(
        METADATA_KEYS.BINARY_EVENT,
        TestService.prototype,
        'onExternalEvent',
      ) as BinaryEventMetadata

      expect(metadata.service).toBe('other-binary')
    })
  })

  describe('metadata isolation', () => {
    it('should keep metadata isolated between methods', () => {
      class TestService {
        @BinaryEvent({ event: 'event-a' })
        handlerA() {}

        @BinaryEvent({ event: 'event-b', service: 'svc-b' })
        handlerB() {}
      }

      const metaA = Reflect.getMetadata(
        METADATA_KEYS.BINARY_EVENT,
        TestService.prototype,
        'handlerA',
      ) as BinaryEventMetadata

      const metaB = Reflect.getMetadata(
        METADATA_KEYS.BINARY_EVENT,
        TestService.prototype,
        'handlerB',
      ) as BinaryEventMetadata

      expect(metaA.event).toBe('event-a')
      expect(metaA.service).toBeUndefined()
      expect(metaB.event).toBe('event-b')
      expect(metaB.service).toBe('svc-b')
    })
  })

  describe('metadata discovery', () => {
    it('should allow checking if a method has @BinaryEvent metadata', () => {
      class TestService {
        @BinaryEvent()
        decorated() {}

        normal() {}
      }

      const hasDecorated = Reflect.hasMetadata(
        METADATA_KEYS.BINARY_EVENT,
        TestService.prototype,
        'decorated',
      )
      const hasNormal = Reflect.hasMetadata(
        METADATA_KEYS.BINARY_EVENT,
        TestService.prototype,
        'normal',
      )

      expect(hasDecorated).toBe(true)
      expect(hasNormal).toBe(false)
    })

    it('should support scanning all BinaryEvent methods in a class', () => {
      class TestService {
        @BinaryEvent()
        first() {}

        helper() {}

        @BinaryEvent({ event: 'custom' })
        second() {}

        @BinaryEvent()
        third() {}
      }

      const proto = TestService.prototype
      const methods = Object.getOwnPropertyNames(proto).filter(
        (name) => name !== 'constructor' && typeof (proto as any)[name] === 'function',
      )

      const events = methods.filter((m) =>
        Reflect.hasMetadata(METADATA_KEYS.BINARY_EVENT, proto, m),
      )

      expect(events).toHaveLength(3)
      expect(events).toContain('first')
      expect(events).toContain('second')
      expect(events).toContain('third')
    })
  })

  describe('coexistence with @BinaryCall', () => {
    it('should not interfere with BINARY_CALL metadata on other methods', () => {
      class TestService {
        @BinaryEvent({ event: 'status' })
        onStatus() {}

        normalMethod() {
          return null
        }
      }

      const hasEvent = Reflect.hasMetadata(
        METADATA_KEYS.BINARY_EVENT,
        TestService.prototype,
        'onStatus',
      )
      const hasCall = Reflect.hasMetadata(
        METADATA_KEYS.BINARY_CALL,
        TestService.prototype,
        'onStatus',
      )

      expect(hasEvent).toBe(true)
      expect(hasCall).toBe(false)
    })
  })
})
