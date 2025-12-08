import { describe, it, expect } from 'vitest'
import { ok, err, type Result, type Ok, type Err } from '../../../src/utils/result'

describe('Result utilities', () => {
  describe('ok()', () => {
    it('should create an Ok result with the given value', () => {
      const result = ok(42)

      expect(result.ok).toBe(true)
      expect(result.value).toBe(42)
    })

    it('should work with string values', () => {
      const result = ok('hello')

      expect(result.ok).toBe(true)
      expect(result.value).toBe('hello')
    })

    it('should work with object values', () => {
      const data = { id: 1, name: 'test' }
      const result = ok(data)

      expect(result.ok).toBe(true)
      expect(result.value).toEqual(data)
    })

    it('should work with null and undefined', () => {
      const nullResult = ok(null)
      const undefinedResult = ok(undefined)

      expect(nullResult.ok).toBe(true)
      expect(nullResult.value).toBeNull()

      expect(undefinedResult.ok).toBe(true)
      expect(undefinedResult.value).toBeUndefined()
    })
  })

  describe('err()', () => {
    it('should create an Err result with the given error', () => {
      const error = { code: 'NOT_FOUND', message: 'Resource not found' }
      const result = err(error)

      expect(result.ok).toBe(false)
      expect(result.error).toEqual(error)
    })

    it('should work with string errors', () => {
      const result = err('Something went wrong')

      expect(result.ok).toBe(false)
      expect(result.error).toBe('Something went wrong')
    })

    it('should work with Error instances', () => {
      const error = new Error('Test error')
      const result = err(error)

      expect(result.ok).toBe(false)
      expect(result.error).toBeInstanceOf(Error)
      expect(result.error.message).toBe('Test error')
    })
  })

  describe('Result type narrowing', () => {
    it('should allow type narrowing with ok property', () => {
      const successResult: Result<number, string> = ok(100)
      const errorResult: Result<number, string> = err('failed')

      if (successResult.ok) {
        // TypeScript should know this is Ok<number>
        expect(successResult.value).toBe(100)
      }

      if (!errorResult.ok) {
        // TypeScript should know this is Err<string>
        expect(errorResult.error).toBe('failed')
      }
    })

    it('should work in conditional expressions', () => {
      function divide(a: number, b: number): Result<number, string> {
        if (b === 0) {
          return err('Division by zero')
        }
        return ok(a / b)
      }

      const success = divide(10, 2)
      const failure = divide(10, 0)

      expect(success.ok).toBe(true)
      if (success.ok) {
        expect(success.value).toBe(5)
      }

      expect(failure.ok).toBe(false)
      if (!failure.ok) {
        expect(failure.error).toBe('Division by zero')
      }
    })
  })
})
