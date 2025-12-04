// @ts-nocheck - Decorators use legacy format, tests pass correctly
import 'reflect-metadata'
import { describe, it, expect, beforeEach } from 'vitest'
import { container } from 'tsyringe'
import { Controller, serverControllerRegistry } from '../../../../src/server/decorators/controller'
import { METADATA_KEYS } from '../../../../src/server/system/metadata-server.keys'

describe('@Controller decorator', () => {
  beforeEach(() => {
    // Clear the registry between tests
    serverControllerRegistry.length = 0
    container.clearInstances()
  })

  describe('class registration', () => {
    it('should register the class in serverControllerRegistry', () => {
      @Controller()
      class TestController {}

      expect(serverControllerRegistry).toContain(TestController)
    })

    it('should register multiple controllers', () => {
      @Controller()
      class FirstController {}

      @Controller()
      class SecondController {}

      @Controller()
      class ThirdController {}

      expect(serverControllerRegistry).toHaveLength(3)
      expect(serverControllerRegistry).toContain(FirstController)
      expect(serverControllerRegistry).toContain(SecondController)
      expect(serverControllerRegistry).toContain(ThirdController)
    })

    it('should not register the same class twice when decorated once', () => {
      @Controller()
      class UniqueController {}

      // Only one entry should exist
      const count = serverControllerRegistry.filter((c) => c === UniqueController).length
      expect(count).toBe(1)
    })
  })

  describe('metadata', () => {
    it('should define controller metadata on the class', () => {
      @Controller()
      class MetadataTestController {}

      const metadata = Reflect.getMetadata(METADATA_KEYS.CONTROLLER, MetadataTestController)

      expect(metadata).toBeDefined()
      expect(metadata.type).toBe('server')
    })

    it('should set type as "server"', () => {
      @Controller()
      class ServerTypeController {}

      const metadata = Reflect.getMetadata(METADATA_KEYS.CONTROLLER, ServerTypeController)

      expect(metadata.type).toBe('server')
    })
  })

  describe('dependency injection', () => {
    it('should make the class injectable via tsyringe', () => {
      @Controller()
      class InjectableController {
        getValue() {
          return 'test-value'
        }
      }

      // Should be resolvable from the container
      const instance = container.resolve(InjectableController)

      expect(instance).toBeInstanceOf(InjectableController)
      expect(instance.getValue()).toBe('test-value')
    })

    it('should support manual dependency injection pattern', () => {
      class DependencyService {
        getName() {
          return 'DependencyService'
        }
      }

      const dep = new DependencyService()

      @Controller()
      class ControllerWithDeps {
        constructor(public dep: DependencyService) {}
      }

      // Manual instantiation with dependencies
      const instance = new ControllerWithDeps(dep)

      expect(instance.dep).toBeInstanceOf(DependencyService)
      expect(instance.dep.getName()).toBe('DependencyService')
    })

    it('should resolve as new instance each time (transient by default)', () => {
      @Controller()
      class TransientController {
        id = Math.random()
      }

      const instance1 = container.resolve(TransientController)
      const instance2 = container.resolve(TransientController)

      // Different instances
      expect(instance1).not.toBe(instance2)
      expect(instance1.id).not.toBe(instance2.id)
    })
  })

  describe('class structure preservation', () => {
    it('should preserve class methods', () => {
      @Controller()
      class MethodController {
        handleEvent() {
          return 'event-handled'
        }

        processData(data: string) {
          return `processed: ${data}`
        }
      }

      const instance = container.resolve(MethodController)

      expect(instance.handleEvent()).toBe('event-handled')
      expect(instance.processData('test')).toBe('processed: test')
    })

    it('should preserve class properties', () => {
      @Controller()
      class PropertyController {
        name = 'TestController'
        count = 0
      }

      const instance = container.resolve(PropertyController)

      expect(instance.name).toBe('TestController')
      expect(instance.count).toBe(0)
    })

    it('should preserve async methods', async () => {
      @Controller()
      class AsyncController {
        async fetchData() {
          return Promise.resolve('async-data')
        }
      }

      const instance = container.resolve(AsyncController)
      const result = await instance.fetchData()

      expect(result).toBe('async-data')
    })
  })
})

