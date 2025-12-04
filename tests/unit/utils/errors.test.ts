import { describe, it, expect } from 'vitest'
import { AppError, SecurityError, isAppError } from '../../../src/utils/errors'

describe('AppError', () => {
  describe('constructor', () => {
    it('should create an error with all properties', () => {
      const error = new AppError('VALIDATION_ERROR', 'Invalid input', 'server', { field: 'email' })

      expect(error.code).toBe('VALIDATION_ERROR')
      expect(error.message).toBe('Invalid input')
      expect(error.origin).toBe('server')
      expect(error.details).toEqual({ field: 'email' })
    })

    it('should work without details', () => {
      const error = new AppError('NOT_IMPLEMENTED', 'Feature not ready', 'core')

      expect(error.code).toBe('NOT_IMPLEMENTED')
      expect(error.message).toBe('Feature not ready')
      expect(error.origin).toBe('core')
      expect(error.details).toBeUndefined()
    })

    it('should be an instance of Error', () => {
      const error = new AppError('UNKNOWN', 'Something went wrong', 'external')

      expect(error).toBeInstanceOf(Error)
      expect(error).toBeInstanceOf(AppError)
    })

    it('should have proper stack trace', () => {
      const error = new AppError('API_ERROR', 'API failed', 'external')

      expect(error.stack).toBeDefined()
      expect(error.stack).toContain('errors.test.ts') // Should reference this test file
    })
  })

  describe('error codes', () => {
    const testCases: Array<{ code: any; message: string }> = [
      { code: 'PLAYER_NOT_FOUND', message: 'Player does not exist' },
      { code: 'INSUFFICIENT_FUNDS', message: 'Not enough money' },
      { code: 'VALIDATION_ERROR', message: 'Invalid data' },
      { code: 'API_ERROR', message: 'External API failed' },
      { code: 'NETWORK_ERROR', message: 'Connection lost' },
      { code: 'UNAUTHORIZED', message: 'Not logged in' },
      { code: 'PERMISSION_DENIED', message: 'Access denied' },
      { code: 'NOT_IMPLEMENTED', message: 'Coming soon' },
      { code: 'UNKNOWN', message: 'Unknown error' },
      { code: 'GAME_STATE_ERROR', message: 'Invalid game state' },
    ]

    testCases.forEach(({ code, message }) => {
      it(`should accept code: ${code}`, () => {
        const error = new AppError(code, message, 'core')
        expect(error.code).toBe(code)
      })
    })
  })

  describe('origins', () => {
    const origins: Array<'client' | 'server' | 'core' | 'external'> = [
      'client',
      'server',
      'core',
      'external',
    ]

    origins.forEach((origin) => {
      it(`should accept origin: ${origin}`, () => {
        const error = new AppError('UNKNOWN', 'Test', origin)
        expect(error.origin).toBe(origin)
      })
    })
  })

  describe('details types', () => {
    it('should accept object details', () => {
      const details = { userId: 123, action: 'login' }
      const error = new AppError('VALIDATION_ERROR', 'Test', 'core', details)

      expect(error.details).toEqual(details)
    })

    it('should accept array details', () => {
      const details = ['error1', 'error2']
      const error = new AppError('VALIDATION_ERROR', 'Test', 'core', details)

      expect(error.details).toEqual(details)
    })

    it('should accept primitive details', () => {
      const error = new AppError('VALIDATION_ERROR', 'Test', 'core', 42)

      expect(error.details).toBe(42)
    })
  })
})

describe('SecurityError', () => {
  describe('constructor', () => {
    it('should create a security error with action', () => {
      const error = new SecurityError('kick', 'Suspicious behavior detected', { reason: 'exploit' })

      expect(error.action).toBe('kick')
      expect(error.message).toBe('Suspicious behavior detected')
      expect(error.details).toEqual({ reason: 'exploit' })
    })

    it('should inherit from AppError', () => {
      const error = new SecurityError('warn', 'Warning issued')

      expect(error).toBeInstanceOf(AppError)
      expect(error).toBeInstanceOf(SecurityError)
      expect(error).toBeInstanceOf(Error)
    })

    it('should have NETWORK_ERROR code', () => {
      const error = new SecurityError('log', 'Logged event')

      expect(error.code).toBe('NETWORK_ERROR')
    })

    it('should have core origin', () => {
      const error = new SecurityError('ban', 'Banned for cheating')

      expect(error.origin).toBe('core')
    })
  })

  describe('security actions', () => {
    const actions = ['kick', 'ban', 'warn', 'log'] as const

    actions.forEach((action) => {
      it(`should accept action: ${action}`, () => {
        const error = new SecurityError(action as any, 'Test action')
        expect(error.action).toBe(action)
      })
    })
  })
})

describe('isAppError', () => {
  it('should return true for AppError instances', () => {
    const error = new AppError('UNKNOWN', 'Test', 'core')

    expect(isAppError(error)).toBe(true)
  })

  it('should return true for SecurityError instances', () => {
    const error = new SecurityError('kick', 'Test')

    expect(isAppError(error)).toBe(true)
  })

  it('should return false for regular Error', () => {
    const error = new Error('Regular error')

    expect(isAppError(error)).toBe(false)
  })

  it('should return false for null', () => {
    expect(isAppError(null)).toBe(false)
  })

  it('should return false for undefined', () => {
    expect(isAppError(undefined)).toBe(false)
  })

  it('should return false for plain objects', () => {
    const obj = { code: 'UNKNOWN', message: 'Fake error' }

    expect(isAppError(obj)).toBe(false)
  })

  it('should return false for strings', () => {
    expect(isAppError('error')).toBe(false)
  })

  it('should return false for numbers', () => {
    expect(isAppError(500)).toBe(false)
  })
})

