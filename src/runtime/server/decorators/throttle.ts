import { container } from 'tsyringe'
import { RateLimiterService } from '../services/rate-limiter.service'
import type { Server } from '../../..'
import type { SecurityAction } from '../types/security.types'
import { SecurityError } from '../../../kernel/utils/error/security.error'

interface ThrottleOptions {
  /**
   * limit of calls per windowMs
   */
  limit: number
  /**
   * time window for numeric overload
   */
  windowMs: number
  /**
   * action to perform on exceed limit
   */
  onExceed?: SecurityAction
  /**
   * custom message to display on exceed limit (ERROR MESSAGE)
   */
  message?: string
}

/**
 * Rate-limits how frequently a method can be called by a specific player.
 *
 * Uses `RateLimiterService` and a unique key composed of:
 * `playerID:ClassName:MethodName`.
 *
 * ## Overload
 * - `@Throttle(5, 1000)` → limit = 5 calls per 1000 ms
 * - `@Throttle({ limit, windowMs, onExceed, message })`
 *
 * ## Behavior
 * If the rate limit is exceeded:
 * - A `SecurityError` is thrown.
 * - Optional custom behavior (`onExceed`) may be executed.
 *
 * ## Example
 * ```ts
 * @Throttle(5, 2000)
 * async search(player: Server.Player, query: string) { ... }
 *
 * @Throttle({ limit: 1, windowMs: 5000, message: "Too fast!" })
 * async placeOrder(player: Server.Player) { ... }
 * ```
 *
 * @param optionsOrLimit - Number (simple mode) or full config object.
 * @param windowMs - Time window for numeric overload.
 */
export function Throttle(optionsOrLimit: number | ThrottleOptions, windowMs?: number) {
  return function (target: any, propertyKey: string, descriptor?: PropertyDescriptor) {
    if (!descriptor) {
      // In benchmarks or edge cases, skip method wrapping
      // This should NOT happen in production code with proper TypeScript compilation
      // Note: Throttle cannot work without descriptor, so we just skip it
      return
    }
    const originalMethod = descriptor.value

    let opts: ThrottleOptions
    if (typeof optionsOrLimit === 'number') {
      opts = { limit: optionsOrLimit, windowMs: windowMs || 1000, onExceed: 'LOG' }
    } else {
      opts = { onExceed: 'LOG', ...optionsOrLimit }
    }

    descriptor.value = async function (...args: any[]) {
      const player = args[0] as Server.Player

      if (player?.clientID) {
        const service = container.resolve(RateLimiterService)
        const key = `${player.clientID}:${target.constructor.name}:${propertyKey}`

        if (!service.checkLimit(key, opts.limit, opts.windowMs)) {
          throw new SecurityError(
            opts.onExceed!,
            opts.message || `Rate limit exceeded on ${propertyKey}`,
            { limit: opts.limit, key },
          )
        }
      }

      return originalMethod.apply(this, args)
    }
    return descriptor
  }
}
