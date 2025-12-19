import 'reflect-metadata'
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { container } from 'tsyringe'
import { Throttle } from '../../../../src/server/decorators/throttle'
import { RateLimiterService } from '../../../../src/server/services/rate-limiter.service'
import { SecurityError } from '../../../../src/utils/error/security.error'

// Mock player type
interface MockPlayer {
  clientID: number
  name: string
}

describe('@Throttle decorator', () => {
  beforeEach(() => {
    container.clearInstances()
    container.registerSingleton(RateLimiterService)
  })

  describe('simple usage (limit, windowMs)', () => {
    it('should allow requests within limit', async () => {
      class TestController {
        @Throttle(5, 1000)
        action(_player: MockPlayer) {
          return 'executed'
        }
      }

      const player: MockPlayer = { clientID: 1, name: 'Player1' }
      const instance = new TestController()

      // First 5 calls should succeed
      for (let i = 0; i < 5; i++) {
        const result = await instance.action.call(instance, player)
        expect(result).toBe('executed')
      }
    })

    it('should block requests exceeding limit', async () => {
      class TestController {
        @Throttle(3, 1000)
        action(_player: MockPlayer) {
          return 'executed'
        }
      }

      const player: MockPlayer = { clientID: 1, name: 'Player1' }
      const instance = new TestController()

      // First 3 calls should succeed
      for (let i = 0; i < 3; i++) {
        await instance.action.call(instance, player)
      }

      // 4th call should fail
      await expect(instance.action.call(instance, player)).rejects.toThrow(SecurityError)
    })

    it('should use default window of 1000ms when only limit provided', async () => {
      class TestController {
        @Throttle(2)
        action(_player: MockPlayer) {
          return 'executed'
        }
      }

      const player: MockPlayer = { clientID: 1, name: 'Player1' }
      const instance = new TestController()

      await instance.action.call(instance, player)
      await instance.action.call(instance, player)

      // 3rd call should fail
      await expect(instance.action.call(instance, player)).rejects.toThrow(SecurityError)
    })
  })

  describe('object options', () => {
    it('should accept full options object', async () => {
      class TestController {
        @Throttle({ limit: 2, windowMs: 500, message: 'Custom rate limit message' })
        action(_player: MockPlayer) {
          return 'executed'
        }
      }

      const player: MockPlayer = { clientID: 1, name: 'Player1' }
      const instance = new TestController()

      await instance.action.call(instance, player)
      await instance.action.call(instance, player)

      await expect(instance.action.call(instance, player)).rejects.toThrow(
        'Custom rate limit message',
      )
    })

    it('should use custom onExceed action', async () => {
      class TestController {
        @Throttle({ limit: 1, windowMs: 1000, onExceed: 'KICK' })
        action(_player: MockPlayer) {
          return 'executed'
        }
      }

      const player: MockPlayer = { clientID: 1, name: 'Player1' }
      const instance = new TestController()

      await instance.action.call(instance, player)

      try {
        await instance.action.call(instance, player)
        expect.fail('Should have thrown')
      } catch (error) {
        expect(error).toBeInstanceOf(SecurityError)
        expect((error as SecurityError).action).toBe('KICK')
      }
    })

    it('should default onExceed to LOG', async () => {
      class TestController {
        @Throttle({ limit: 1, windowMs: 1000 })
        action(_player: MockPlayer) {
          return 'executed'
        }
      }

      const player: MockPlayer = { clientID: 1, name: 'Player1' }
      const instance = new TestController()

      await instance.action.call(instance, player)

      try {
        await instance.action.call(instance, player)
        expect.fail('Should have thrown')
      } catch (error) {
        expect(error).toBeInstanceOf(SecurityError)
        expect((error as SecurityError).action).toBe('LOG')
      }
    })
  })

  describe('player-specific rate limiting', () => {
    it('should track limits separately per player', async () => {
      class TestController {
        @Throttle(2, 1000)
        action(_player: MockPlayer) {
          return 'executed'
        }
      }

      const player1: MockPlayer = { clientID: 1, name: 'Player1' }
      const player2: MockPlayer = { clientID: 2, name: 'Player2' }
      const instance = new TestController()

      // Player1 uses their limit
      await instance.action.call(instance, player1)
      await instance.action.call(instance, player1)

      // Player2 should still have their own limit
      const result = await instance.action.call(instance, player2)
      expect(result).toBe('executed')

      // Player1 should be blocked
      await expect(instance.action.call(instance, player1)).rejects.toThrow(SecurityError)

      // Player2 still has one more
      const result2 = await instance.action.call(instance, player2)
      expect(result2).toBe('executed')
    })
  })

  describe('method-specific rate limiting', () => {
    it('should track limits separately per method', async () => {
      class TestController {
        @Throttle(2, 1000)
        method1(_player: MockPlayer) {
          return 'method1'
        }

        @Throttle(2, 1000)
        method2(_player: MockPlayer) {
          return 'method2'
        }
      }

      const player: MockPlayer = { clientID: 1, name: 'Player1' }
      const instance = new TestController()

      // Use up method1 limit
      await instance.method1.call(instance, player)
      await instance.method1.call(instance, player)

      // method2 should still work
      const result = await instance.method2.call(instance, player)
      expect(result).toBe('method2')

      // method1 should be blocked
      await expect(instance.method1.call(instance, player)).rejects.toThrow(SecurityError)
    })
  })

  describe('method behavior preservation', () => {
    it('should pass arguments to original method', async () => {
      class TestController {
        @Throttle(10, 1000)
        processData(_player: MockPlayer, data: string, count: number) {
          return { data, count }
        }
      }

      const player: MockPlayer = { clientID: 1, name: 'Player1' }
      const instance = new TestController()

      const result = await instance.processData.call(instance, player, 'test', 42)

      expect(result).toEqual({ data: 'test', count: 42 })
    })

    it('should preserve async method behavior', async () => {
      class TestController {
        @Throttle(10, 1000)
        async fetchData(_player: MockPlayer) {
          await new Promise((r) => setTimeout(r, 10))
          return 'async-data'
        }
      }

      const player: MockPlayer = { clientID: 1, name: 'Player1' }
      const instance = new TestController()

      const result = await instance.fetchData.call(instance, player)
      expect(result).toBe('async-data')
    })

    it('should preserve this context', async () => {
      class TestController {
        private prefix = 'Result: '

        @Throttle(10, 1000)
        formatResult(_player: MockPlayer, value: string) {
          return this.prefix + value
        }
      }

      const player: MockPlayer = { clientID: 1, name: 'Player1' }
      const instance = new TestController()

      const result = await instance.formatResult.call(instance, player, 'test')
      expect(result).toBe('Result: test')
    })
  })

  describe('edge cases', () => {
    it('should handle missing player gracefully', async () => {
      class TestController {
        @Throttle(5, 1000)
        action(_player: MockPlayer) {
          return 'executed'
        }
      }

      const instance = new TestController()

      // Should still execute if player check is skipped
      const result = await instance.action.call(instance, null as any)
      expect(result).toBe('executed')
    })

    it('should handle player without clientID', async () => {
      class TestController {
        @Throttle(5, 1000)
        action(_player: MockPlayer) {
          return 'executed'
        }
      }

      const instance = new TestController()
      const invalidPlayer = { name: 'NoClientID' } as any

      // Should execute without rate limiting if no clientID
      const result = await instance.action.call(instance, invalidPlayer)
      expect(result).toBe('executed')
    })

    it('should handle very high limits', async () => {
      class TestController {
        @Throttle(1000000, 1000)
        action(_player: MockPlayer) {
          return 'executed'
        }
      }

      const player: MockPlayer = { clientID: 1, name: 'Player1' }
      const instance = new TestController()

      // Should work fine with high limit
      for (let i = 0; i < 100; i++) {
        const result = await instance.action.call(instance, player)
        expect(result).toBe('executed')
      }
    })
  })

  describe('window expiration', () => {
    it('should reset limit after window expires', async () => {
      vi.useFakeTimers()

      class TestController {
        @Throttle(2, 100) // 100ms window
        action(_player: MockPlayer) {
          return 'executed'
        }
      }

      const player: MockPlayer = { clientID: 1, name: 'Player1' }
      const instance = new TestController()

      // Use up the limit
      await instance.action.call(instance, player)
      await instance.action.call(instance, player)

      // Should be blocked
      await expect(instance.action.call(instance, player)).rejects.toThrow(SecurityError)

      // Advance time past window
      vi.advanceTimersByTime(150)

      // Should work again
      const result = await instance.action.call(instance, player)
      expect(result).toBe('executed')

      vi.useRealTimers()
    })
  })
})
