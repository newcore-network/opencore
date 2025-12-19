import 'reflect-metadata'
import { describe, it, expect } from 'vitest'
import { Export } from '../../../../src/server/decorators/export'
import { METADATA_KEYS } from '../../../../src/server/system/metadata-server.keys'

describe('@Export decorator', () => {
  describe('default export name', () => {
    it('should use method name as export name when no name provided', () => {
      class ApiController {
        @Export()
        getPlayerData() {}
      }

      const metadata = Reflect.getMetadata(
        METADATA_KEYS.EXPORT,
        ApiController.prototype,
        'getPlayerData',
      )

      expect(metadata).toBeDefined()
      expect(metadata.exportName).toBe('getPlayerData')
    })

    it('should handle different method names correctly', () => {
      class ServiceController {
        @Export()
        fetchUserById() {}

        @Export()
        createTransaction() {}

        @Export()
        validateSession() {}
      }

      expect(
        Reflect.getMetadata(METADATA_KEYS.EXPORT, ServiceController.prototype, 'fetchUserById'),
      ).toEqual({ exportName: 'fetchUserById' })

      expect(
        Reflect.getMetadata(METADATA_KEYS.EXPORT, ServiceController.prototype, 'createTransaction'),
      ).toEqual({ exportName: 'createTransaction' })

      expect(
        Reflect.getMetadata(METADATA_KEYS.EXPORT, ServiceController.prototype, 'validateSession'),
      ).toEqual({ exportName: 'validateSession' })
    })
  })

  describe('custom export name', () => {
    it('should use provided name as export name', () => {
      class ApiController {
        @Export('GetPlayer')
        getPlayerData() {}
      }

      const metadata = Reflect.getMetadata(
        METADATA_KEYS.EXPORT,
        ApiController.prototype,
        'getPlayerData',
      )

      expect(metadata.exportName).toBe('GetPlayer')
    })

    it('should allow different export name than method name', () => {
      class BankController {
        @Export('Bank_GetBalance')
        internalGetBalance() {}

        @Export('Bank_Deposit')
        internalDeposit() {}

        @Export('Bank_Withdraw')
        internalWithdraw() {}
      }

      expect(
        Reflect.getMetadata(METADATA_KEYS.EXPORT, BankController.prototype, 'internalGetBalance'),
      ).toEqual({ exportName: 'Bank_GetBalance' })

      expect(
        Reflect.getMetadata(METADATA_KEYS.EXPORT, BankController.prototype, 'internalDeposit'),
      ).toEqual({ exportName: 'Bank_Deposit' })

      expect(
        Reflect.getMetadata(METADATA_KEYS.EXPORT, BankController.prototype, 'internalWithdraw'),
      ).toEqual({ exportName: 'Bank_Withdraw' })
    })
  })

  describe('method preservation', () => {
    it('should not modify original method', () => {
      class MathController {
        @Export('Calculate')
        add(a: number, b: number) {
          return a + b
        }
      }

      const instance = new MathController()
      expect(instance.add(5, 3)).toBe(8)
    })

    it('should preserve async methods', async () => {
      class AsyncController {
        @Export('FetchData')
        async fetchData() {
          return 'async-data'
        }
      }

      const instance = new AsyncController()
      const result = await instance.fetchData()
      expect(result).toBe('async-data')
    })

    it('should preserve this context', () => {
      class ContextController {
        private multiplier = 2

        @Export('Multiply')
        multiply(value: number) {
          return value * this.multiplier
        }
      }

      const instance = new ContextController()
      expect(instance.multiply(5)).toBe(10)
    })
  })

  describe('metadata discovery', () => {
    it('should allow checking if method is exported', () => {
      class TestController {
        @Export()
        exportedMethod() {}

        internalMethod() {}
      }

      expect(
        Reflect.hasMetadata(METADATA_KEYS.EXPORT, TestController.prototype, 'exportedMethod'),
      ).toBe(true)

      expect(
        Reflect.hasMetadata(METADATA_KEYS.EXPORT, TestController.prototype, 'internalMethod'),
      ).toBe(false)
    })

    it('should support scanning for all exports', () => {
      class ApiController {
        @Export('API_First')
        first() {}

        internal() {}

        @Export('API_Second')
        second() {}

        @Export()
        third() {}

        anotherInternal() {}
      }

      const prototype = ApiController.prototype
      const methods = Object.getOwnPropertyNames(prototype).filter(
        (name) => name !== 'constructor' && typeof (prototype as any)[name] === 'function',
      )

      const exports = methods
        .filter((method) => Reflect.hasMetadata(METADATA_KEYS.EXPORT, prototype, method))
        .map((method) => {
          const meta = Reflect.getMetadata(METADATA_KEYS.EXPORT, prototype, method)
          return { method, exportName: meta.exportName }
        })

      expect(exports).toHaveLength(3)
      expect(exports).toContainEqual({ method: 'first', exportName: 'API_First' })
      expect(exports).toContainEqual({ method: 'second', exportName: 'API_Second' })
      expect(exports).toContainEqual({ method: 'third', exportName: 'third' })
    })
  })

  describe('edge cases', () => {
    it('should use method name when empty string provided (falsy check)', () => {
      // The decorator uses `name || propertyKey`, so empty string falls back to method name
      class TestController {
        @Export('')
        emptyName() {}
      }

      const metadata = Reflect.getMetadata(
        METADATA_KEYS.EXPORT,
        TestController.prototype,
        'emptyName',
      )

      // Empty string is falsy, so it falls back to propertyKey
      expect(metadata.exportName).toBe('emptyName')
    })

    it('should handle export names with special characters', () => {
      class TestController {
        @Export('Get_Player-Data.v2')
        handler() {}
      }

      const metadata = Reflect.getMetadata(
        METADATA_KEYS.EXPORT,
        TestController.prototype,
        'handler',
      )

      expect(metadata.exportName).toBe('Get_Player-Data.v2')
    })

    it('should handle export names with numbers', () => {
      class TestController {
        @Export('api_v2_getData')
        handler() {}
      }

      const metadata = Reflect.getMetadata(
        METADATA_KEYS.EXPORT,
        TestController.prototype,
        'handler',
      )

      expect(metadata.exportName).toBe('api_v2_getData')
    })
  })
})
