import { container } from 'tsyringe'
import { RateLimiterService } from '../services/rate-limiter.service'
import type { Server } from '../..'
import type { SecurityAction } from '../types/security.types'
import { SecurityError } from '../../utils'

interface ThrottleOptions {
  limit: number
  windowMs: number
  onExceed?: SecurityAction
  message?: string
}

export function Throttle(optionsOrLimit: number | ThrottleOptions, windowMs?: number) {
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
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
