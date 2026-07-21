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
  private static readonly CLEANUP_INTERVAL_MS = 60_000

  private hits = new Map<string, { timestamps: number[]; windowMs: number }>()
  private lastCleanupAt = 0

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
    const existing = this.hits.get(key)
    const timestamps = existing?.timestamps || []
    const retentionWindowMs = Math.max(existing?.windowMs || 0, windowMs)

    const validTimestamps = timestamps.filter((t) => now - t < windowMs)

    if (validTimestamps.length >= limit) {
      return false
    }

    const retainedTimestamps = timestamps.filter((t) => now - t < retentionWindowMs)
    retainedTimestamps.push(now)
    this.hits.set(key, {
      timestamps: retainedTimestamps,
      // Retain entries for the longest window ever used for a key so cleanup
      // cannot remove hits that may still enforce a configured throttle.
      windowMs: retentionWindowMs,
    })

    if (
      this.hits.size > 5000 ||
      now - this.lastCleanupAt > RateLimiterService.CLEANUP_INTERVAL_MS
    ) {
      this.cleanup(now)
    }

    return true
  }

  /**
   * Best-effort cleanup to prevent unbounded memory growth.
   *
   * @remarks
   * Runs both on a size threshold and on a fixed time interval, so bursty churn
   * across many distinct keys can't grow memory unbounded while staying under
   * the size threshold between bursts.
   */
  private cleanup(now: number) {
    this.lastCleanupAt = now
    for (const [key, entry] of this.hits.entries()) {
      if (entry.timestamps.every((t) => now - t >= entry.windowMs)) this.hits.delete(key)
    }
  }
}
