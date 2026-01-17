import 'reflect-metadata'
import { container } from 'tsyringe'
import { beforeEach, describe, expect, it } from 'vitest'
import { Bind } from '../../../../src/runtime/server/decorators/bind'

describe('@Bind decorator', () => {
  beforeEach(() => {
    container.clearInstances()
  })

  describe('singleton scope (default)', () => {
    it('should create class as singleton by default', () => {
      @Bind()
      class SingletonService {
        id = Math.random()
      }

      const instance1 = container.resolve(SingletonService)
      const instance2 = container.resolve(SingletonService)

      expect(instance1).toBe(instance2)
      expect(instance1.id).toBe(instance2.id)
    })

    it('should create class as singleton with explicit "singleton" scope', () => {
      @Bind('singleton')
      class ExplicitSingleton {
        id = Math.random()
      }

      const instance1 = container.resolve(ExplicitSingleton)
      const instance2 = container.resolve(ExplicitSingleton)

      expect(instance1).toBe(instance2)
    })

    it('should maintain singleton state across resolutions', () => {
      @Bind()
      class StatefulService {
        private counter = 0

        increment() {
          return ++this.counter
        }

        getCount() {
          return this.counter
        }
      }

      const instance1 = container.resolve(StatefulService)
      const instance2 = container.resolve(StatefulService)

      instance1.increment()
      instance1.increment()
      instance1.increment()

      expect(instance2.getCount()).toBe(3)
    })
  })

  describe('transient scope', () => {
    it('should create new instance each time with transient scope', () => {
      @Bind('transient')
      class TransientService {
        id = Math.random()
      }

      const instance1 = container.resolve(TransientService)
      const instance2 = container.resolve(TransientService)

      expect(instance1).not.toBe(instance2)
      expect(instance1.id).not.toBe(instance2.id)
    })

    it('should not share state between transient instances', () => {
      @Bind('transient')
      class StatefulTransient {
        private counter = 0

        increment() {
          return ++this.counter
        }

        getCount() {
          return this.counter
        }
      }

      const instance1 = container.resolve(StatefulTransient)
      const instance2 = container.resolve(StatefulTransient)

      instance1.increment()
      instance1.increment()
      instance1.increment()

      expect(instance1.getCount()).toBe(3)
      expect(instance2.getCount()).toBe(0)
    })
  })

  describe('dependency injection', () => {
    it('should make class injectable and resolvable', () => {
      @Bind()
      class InjectableService {
        getValue() {
          return 'injectable-value'
        }
      }

      const instance = container.resolve(InjectableService)
      expect(instance).toBeInstanceOf(InjectableService)
      expect(instance.getValue()).toBe('injectable-value')
    })

    it('should work with manual registration for dependencies', () => {
      @Bind()
      class MockService {
        getData() {
          return 'result'
        }
      }

      // Manually inject dependency since DI requires runtime metadata
      const mockInstance = container.resolve(MockService)

      class UserService {
        constructor(private mock: MockService) {}
        getUsers() {
          return this.mock.getData()
        }
      }

      const userService = new UserService(mockInstance)
      expect(userService.getUsers()).toBe('result')
    })

    it('should allow manual singleton sharing pattern', () => {
      @Bind()
      class SharedService {
        id = Math.random()
      }

      // Both get the same singleton
      const shared1 = container.resolve(SharedService)
      const shared2 = container.resolve(SharedService)

      class ConsumerA {
        constructor(public shared: SharedService) {}
      }

      class ConsumerB {
        constructor(public shared: SharedService) {}
      }

      const consumerA = new ConsumerA(shared1)
      const consumerB = new ConsumerB(shared2)

      expect(consumerA.shared).toBe(consumerB.shared)
      expect(consumerA.shared.id).toBe(consumerB.shared.id)
    })
  })

  describe('method preservation', () => {
    it('should preserve class methods', () => {
      @Bind()
      class CalculatorService {
        add(a: number, b: number) {
          return a + b
        }

        multiply(a: number, b: number) {
          return a * b
        }
      }

      const instance = container.resolve(CalculatorService)

      expect(instance.add(5, 3)).toBe(8)
      expect(instance.multiply(4, 7)).toBe(28)
    })

    it('should preserve async methods', async () => {
      @Bind()
      class AsyncService {
        async fetchData() {
          await new Promise((r) => setTimeout(r, 10))
          return 'async-data'
        }
      }

      const instance = container.resolve(AsyncService)
      const result = await instance.fetchData()

      expect(result).toBe('async-data')
    })

    it('should preserve getters and setters', () => {
      @Bind()
      class PropertyService {
        private _value = 0

        get value() {
          return this._value
        }

        set value(v: number) {
          this._value = v
        }
      }

      const instance = container.resolve(PropertyService)

      instance.value = 42
      expect(instance.value).toBe(42)
    })
  })

  describe('class properties', () => {
    it('should preserve initial property values', () => {
      @Bind()
      class ConfigService {
        name = 'default-name'
        version = '1.0.0'
        enabled = true
      }

      const instance = container.resolve(ConfigService)

      expect(instance.name).toBe('default-name')
      expect(instance.version).toBe('1.0.0')
      expect(instance.enabled).toBe(true)
    })

    it('should allow property modification', () => {
      @Bind()
      class MutableService {
        data: string[] = []
      }

      const instance = container.resolve(MutableService)

      instance.data.push('item1')
      instance.data.push('item2')

      expect(instance.data).toEqual(['item1', 'item2'])
    })
  })

  describe('edge cases', () => {
    it('should handle classes with no constructor', () => {
      @Bind()
      class SimpleService {
        getValue() {
          return 'simple'
        }
      }

      const instance = container.resolve(SimpleService)
      expect(instance.getValue()).toBe('simple')
    })

    it('should handle manual composition of complex services', () => {
      @Bind()
      class ConfigService {
        getConfig() {
          return { key: 'value' }
        }
      }

      @Bind()
      class LoggerService {
        log(msg: string) {
          return `LOG: ${msg}`
        }
      }

      // Manual composition since tsyringe needs runtime metadata for auto-injection
      const config = container.resolve(ConfigService)
      const logger = container.resolve(LoggerService)

      class ComplexService {
        constructor(
          private config: ConfigService,
          private logger: LoggerService,
        ) {}

        process() {
          const cfg = this.config.getConfig()
          return this.logger.log(`Config key: ${cfg.key}`)
        }
      }

      const instance = new ComplexService(config, logger)
      expect(instance.process()).toBe('LOG: Config key: value')
    })
  })
})
