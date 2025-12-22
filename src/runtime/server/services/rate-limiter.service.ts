import { injectable } from 'tsyringe'

/**
 * In-memory rate limiter used by security-related decorators.
 *
 * @remarks
 * This service is intentionally simple and process-local.
 * It is primarily used by {@link Throttle} to enforce per-player call limits.
 */
@injectable()
export class RateLimiterService {
  private hits = new Map<string, number[]>()

  /**
   * Checks whether a key is still within the rate limit window.
   *
   * @param key - Unique identifier for the caller/action.
   * @param limit - Maximum number of calls allowed within the time window.
   * @param windowMs - Sliding window size in milliseconds.
   * @returns `true` if the call is allowed; `false` if the limit was exceeded.
   */
  checkLimit(key: string, limit: number, windowMs: number): boolean {
    const now = Date.now()
    const timestamps = this.hits.get(key) || []

    const validTimestamps = timestamps.filter((t) => now - t < windowMs)

    if (validTimestamps.length >= limit) {
      return false
    }

    validTimestamps.push(now)
    this.hits.set(key, validTimestamps)

    if (this.hits.size > 5000) this.cleanup()

    return true
  }

  /**
   * Best-effort cleanup to prevent unbounded memory growth.
   */
  private cleanup() {
    const now = Date.now()
    for (const [key, times] of this.hits.entries()) {
      if (times.every((t) => now - t > 60000)) this.hits.delete(key)
    }
  }
}
