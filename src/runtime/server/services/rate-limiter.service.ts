import { injectable } from 'tsyringe'

@injectable()
export class RateLimiterService {
  private hits = new Map<string, number[]>()

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

  private cleanup() {
    const now = Date.now()
    for (const [key, times] of this.hits.entries()) {
      if (times.every((t) => now - t > 60000)) this.hits.delete(key)
    }
  }
}
