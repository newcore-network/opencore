import 'reflect-metadata'
import { describe, expect, it } from 'vitest'
import {
  BinaryService,
  type BinaryServiceMetadata,
  getServerBinaryServiceRegistry,
  _serverBinaryServiceRegistryByResource,
} from '../../../../src/runtime/server/decorators/binaryService'
import { METADATA_KEYS } from '../../../../src/runtime/server/system/metadata-server.keys'

describe('@BinaryService decorator', () => {
  describe('metadata registration', () => {
    it('should store BINARY_SERVICE metadata on the class', () => {
      @BinaryService({ name: 'test-svc', binary: 'test-bin' })
      class TestService {}

      const metadata = Reflect.getMetadata(
        METADATA_KEYS.BINARY_SERVICE,
        TestService,
      ) as BinaryServiceMetadata

      expect(metadata).toBeDefined()
      expect(metadata.name).toBe('test-svc')
      expect(metadata.binary).toBe('test-bin')
      expect(metadata.serviceClass).toBe(TestService)
    })

    it('should store BINARY_SERVICE_NAME metadata on the class', () => {
      @BinaryService({ name: 'named-svc', binary: 'named-bin' })
      class NamedService {}

      const name = Reflect.getMetadata(METADATA_KEYS.BINARY_SERVICE_NAME, NamedService)
      expect(name).toBe('named-svc')
    })

    it('should store optional timeoutMs', () => {
      @BinaryService({ name: 'timeout-svc', binary: 'timeout-bin', timeoutMs: 5000 })
      class TimeoutService {}

      const metadata = Reflect.getMetadata(
        METADATA_KEYS.BINARY_SERVICE,
        TimeoutService,
      ) as BinaryServiceMetadata

      expect(metadata.timeoutMs).toBe(5000)
    })

    it('should leave timeoutMs undefined when not provided', () => {
      @BinaryService({ name: 'no-timeout', binary: 'no-timeout-bin' })
      class NoTimeoutService {}

      const metadata = Reflect.getMetadata(
        METADATA_KEYS.BINARY_SERVICE,
        NoTimeoutService,
      ) as BinaryServiceMetadata

      expect(metadata.timeoutMs).toBeUndefined()
    })
  })

  describe('resource registry', () => {
    it('should register the class in the binary service registry', () => {
      _serverBinaryServiceRegistryByResource.clear()

      @BinaryService({ name: 'registry-svc', binary: 'registry-bin' })
      class RegistryService {}

      const registry = getServerBinaryServiceRegistry()
      expect(registry).toContain(RegistryService)
    })

    it('should support multiple services in the same resource', () => {
      _serverBinaryServiceRegistryByResource.clear()

      @BinaryService({ name: 'svc-a', binary: 'bin-a' })
      class ServiceA {}

      @BinaryService({ name: 'svc-b', binary: 'bin-b' })
      class ServiceB {}

      const registry = getServerBinaryServiceRegistry()
      expect(registry).toContain(ServiceA)
      expect(registry).toContain(ServiceB)
      expect(registry).toHaveLength(2)
    })
  })

  describe('binary name validation', () => {
    it('should throw if binary name is empty', () => {
      expect(() => {
        @BinaryService({ name: 'svc', binary: '' })
        class _S {}
      }).toThrow(/non-empty binary name/)
    })

    it('should throw if binary name contains an extension', () => {
      expect(() => {
        @BinaryService({ name: 'svc', binary: 'my-bin.exe' })
        class _S {}
      }).toThrow(/must not include extensions/)
    })

    it('should throw if binary name contains path separators', () => {
      expect(() => {
        @BinaryService({ name: 'svc', binary: 'path/to/bin' })
        class _S {}
      }).toThrow(/must not include path separators/)
    })

    it('should throw if binary name contains backslash separators', () => {
      expect(() => {
        @BinaryService({ name: 'svc', binary: 'path\\to\\bin' })
        class _S {}
      }).toThrow(/must not include path separators/)
    })

    it('should throw if binary name has invalid characters', () => {
      expect(() => {
        @BinaryService({ name: 'svc', binary: 'my bin' })
        class _S {}
      }).toThrow(/invalid characters/)
    })

    it('should accept valid binary names with hyphens and underscores', () => {
      expect(() => {
        @BinaryService({ name: 'valid-svc', binary: 'my-binary_v2' })
        class _S {}
      }).not.toThrow()
    })
  })

  describe('service name validation', () => {
    it('should throw if service name is empty', () => {
      expect(() => {
        @BinaryService({ name: '', binary: 'bin' })
        class _S {}
      }).toThrow(/non-empty service name/)
    })

    it('should throw if service name is whitespace only', () => {
      expect(() => {
        @BinaryService({ name: '   ', binary: 'bin' })
        class _S {}
      }).toThrow(/non-empty service name/)
    })
  })
})
