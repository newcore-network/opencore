import 'reflect-metadata'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { IExports } from '../../../../../src/adapters'
import { Export } from '../../../../../src/runtime/server/decorators/export'
import { METADATA_KEYS } from '../../../../../src/runtime/server/system/metadata-server.keys'
import { ExportProcessor } from '../../../../../src/runtime/server/system/processors/export.processor'

/**
 * Mock implementation of IExports for testing.
 * This validates that ExportProcessor uses the capability interface
 * rather than direct FiveM exports.
 */
class MockExports extends IExports {
  registeredExports = new Map<string, Function>()

  register(exportName: string, handler: (...args: any[]) => any): void {
    this.registeredExports.set(exportName, handler)
  }

  getResource<T = any>(_resourceName: string): T | undefined {
    return undefined
  }
}

describe('ExportProcessor', () => {
  let mockExports: MockExports
  let processor: ExportProcessor

  beforeEach(() => {
    mockExports = new MockExports()
    processor = new ExportProcessor(mockExports)
  })

  it('should have EXPORT metadata key', () => {
    expect(processor.metadataKey).toBe(METADATA_KEYS.EXPORT)
  })

  it('should register export using IExports.register()', () => {
    const registerSpy = vi.spyOn(mockExports, 'register')

    class TestController {
      @Export('testExport')
      getData() {
        return 'test-data'
      }
    }

    const instance = new TestController()
    const metadata = Reflect.getMetadata(METADATA_KEYS.EXPORT, TestController.prototype, 'getData')

    processor.process(instance, 'getData', metadata)

    expect(registerSpy).toHaveBeenCalledWith('testExport', expect.any(Function))
  })

  it('should register handler that invokes the original method', () => {
    class TestController {
      @Export('sumExport')
      sum(a: number, b: number) {
        return a + b
      }
    }

    const instance = new TestController()
    const metadata = Reflect.getMetadata(METADATA_KEYS.EXPORT, TestController.prototype, 'sum')

    processor.process(instance, 'sum', metadata)

    // Get the registered handler
    const handler = mockExports.registeredExports.get('sumExport')
    expect(handler).toBeDefined()

    // Call the handler and verify it works
    const result = handler!(5, 3)
    expect(result).toBe(8)
  })

  it('should preserve this context when calling exported method', () => {
    class TestController {
      private multiplier = 10

      @Export('multiply')
      multiply(value: number) {
        return value * this.multiplier
      }
    }

    const instance = new TestController()
    const metadata = Reflect.getMetadata(METADATA_KEYS.EXPORT, TestController.prototype, 'multiply')

    processor.process(instance, 'multiply', metadata)

    const handler = mockExports.registeredExports.get('multiply')
    expect(handler).toBeDefined()

    const result = handler!(5)
    expect(result).toBe(50)
  })

  it('should handle async exported methods', async () => {
    class TestController {
      @Export('asyncFetch')
      async fetchData() {
        return Promise.resolve('async-data')
      }
    }

    const instance = new TestController()
    const metadata = Reflect.getMetadata(
      METADATA_KEYS.EXPORT,
      TestController.prototype,
      'fetchData',
    )

    processor.process(instance, 'fetchData', metadata)

    const handler = mockExports.registeredExports.get('asyncFetch')
    expect(handler).toBeDefined()

    const result = await handler!()
    expect(result).toBe('async-data')
  })

  it('should use method name as export name when not specified', () => {
    class TestController {
      @Export()
      defaultExportName() {
        return 'default'
      }
    }

    const instance = new TestController()
    const metadata = Reflect.getMetadata(
      METADATA_KEYS.EXPORT,
      TestController.prototype,
      'defaultExportName',
    )

    processor.process(instance, 'defaultExportName', metadata)

    expect(mockExports.registeredExports.has('defaultExportName')).toBe(true)
  })

  it('should register multiple exports from the same controller', () => {
    class TestController {
      @Export('getUser')
      getUser(id: string) {
        return { id, name: 'Test User' }
      }

      @Export('deleteUser')
      deleteUser(id: string) {
        return true
      }
    }

    const instance = new TestController()

    // Process both methods
    const getUserMetadata = Reflect.getMetadata(
      METADATA_KEYS.EXPORT,
      TestController.prototype,
      'getUser',
    )
    const deleteUserMetadata = Reflect.getMetadata(
      METADATA_KEYS.EXPORT,
      TestController.prototype,
      'deleteUser',
    )

    processor.process(instance, 'getUser', getUserMetadata)
    processor.process(instance, 'deleteUser', deleteUserMetadata)

    expect(mockExports.registeredExports.has('getUser')).toBe(true)
    expect(mockExports.registeredExports.has('deleteUser')).toBe(true)
    expect(mockExports.registeredExports.size).toBe(2)
  })

  it('should not call direct FiveM exports global', () => {
    // This test verifies the architecture: ExportProcessor should only
    // use the injected IExports capability, never direct FiveM globals.

    // The fact that we can test with MockExports proves the processor
    // doesn't depend on real FiveM exports.

    const globalExportsCalled = vi.fn()
    ;(globalThis as any).exports = globalExportsCalled

    class TestController {
      @Export('noDirectExports')
      handler() {
        return 'test'
      }
    }

    const instance = new TestController()
    const metadata = Reflect.getMetadata(METADATA_KEYS.EXPORT, TestController.prototype, 'handler')

    processor.process(instance, 'handler', metadata)

    // The global exports should NOT have been called
    expect(globalExportsCalled).not.toHaveBeenCalled()

    // Instead, our mock's register was used
    expect(mockExports.registeredExports.has('noDirectExports')).toBe(true)

    // Cleanup
    delete (globalThis as any).exports
  })
})
