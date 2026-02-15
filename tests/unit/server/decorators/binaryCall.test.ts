import 'reflect-metadata'
import { describe, expect, it } from 'vitest'
import { BinaryCall } from '../../../../src/runtime/server/decorators/binaryCall'
import { METADATA_KEYS } from '../../../../src/runtime/server/system/metadata-server.keys'

describe('@BinaryCall decorator', () => {
  describe('metadata registration', () => {
    it('should store BINARY_CALL metadata with defaults', () => {
      class TestService {
        @BinaryCall()
        getStatus() {
          return null
        }
      }

      const metadata = Reflect.getMetadata(
        METADATA_KEYS.BINARY_CALL,
        TestService.prototype,
        'getStatus',
      )

      expect(metadata).toBeDefined()
      expect(metadata.methodName).toBe('getStatus')
      expect(metadata.action).toBe('getStatus')
      expect(metadata.timeoutMs).toBeUndefined()
      expect(metadata.service).toBeUndefined()
    })

    it('should respect action override', () => {
      class TestService {
        @BinaryCall({ action: 'custom_action' })
        doSomething() {
          return null
        }
      }

      const metadata = Reflect.getMetadata(
        METADATA_KEYS.BINARY_CALL,
        TestService.prototype,
        'doSomething',
      )

      expect(metadata.action).toBe('custom_action')
      expect(metadata.methodName).toBe('doSomething')
    })

    it('should respect timeoutMs option', () => {
      class TestService {
        @BinaryCall({ timeoutMs: 3000 })
        slowCall() {
          return null
        }
      }

      const metadata = Reflect.getMetadata(
        METADATA_KEYS.BINARY_CALL,
        TestService.prototype,
        'slowCall',
      )

      expect(metadata.timeoutMs).toBe(3000)
    })

    it('should respect service option', () => {
      class TestService {
        @BinaryCall({ service: 'other-service' })
        crossCall() {
          return null
        }
      }

      const metadata = Reflect.getMetadata(
        METADATA_KEYS.BINARY_CALL,
        TestService.prototype,
        'crossCall',
      )

      expect(metadata.service).toBe('other-service')
    })
  })

  describe('metadata isolation', () => {
    it('should keep metadata isolated between methods', () => {
      class TestService {
        @BinaryCall({ action: 'action_a', timeoutMs: 1000 })
        methodA() {
          return null
        }

        @BinaryCall({ action: 'action_b' })
        methodB() {
          return null
        }
      }

      const metaA = Reflect.getMetadata(METADATA_KEYS.BINARY_CALL, TestService.prototype, 'methodA')
      const metaB = Reflect.getMetadata(METADATA_KEYS.BINARY_CALL, TestService.prototype, 'methodB')

      expect(metaA.action).toBe('action_a')
      expect(metaA.timeoutMs).toBe(1000)
      expect(metaB.action).toBe('action_b')
      expect(metaB.timeoutMs).toBeUndefined()
    })
  })

  describe('metadata discovery', () => {
    it('should allow scanning for decorated methods', () => {
      class TestService {
        @BinaryCall()
        decorated() {
          return null
        }

        normal() {}
      }

      const hasDecorated = Reflect.hasMetadata(
        METADATA_KEYS.BINARY_CALL,
        TestService.prototype,
        'decorated',
      )
      const hasNormal = Reflect.hasMetadata(
        METADATA_KEYS.BINARY_CALL,
        TestService.prototype,
        'normal',
      )

      expect(hasDecorated).toBe(true)
      expect(hasNormal).toBe(false)
    })

    it('should support scanning all BinaryCall methods in a class', () => {
      class TestService {
        @BinaryCall()
        first() {
          return null
        }

        helper() {}

        @BinaryCall()
        second() {
          return null
        }

        @BinaryCall({ action: 'third_action' })
        third() {
          return null
        }
      }

      const proto = TestService.prototype
      const methods = Object.getOwnPropertyNames(proto).filter(
        (name) => name !== 'constructor' && typeof (proto as any)[name] === 'function',
      )

      const calls = methods.filter((m) => Reflect.hasMetadata(METADATA_KEYS.BINARY_CALL, proto, m))

      expect(calls).toHaveLength(3)
      expect(calls).toContain('first')
      expect(calls).toContain('second')
      expect(calls).toContain('third')
    })
  })

  describe('error handling', () => {
    it('should throw if descriptor.value is undefined', () => {
      expect(() => {
        class TestService {
          @BinaryCall()
          get prop(): string {
            return ''
          }
        }

        void TestService
      }).toThrow(/descriptor\.value is undefined/)
    })
  })
})
