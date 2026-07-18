import 'reflect-metadata'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { RateLimiterService } from '../../../../src/runtime/server/services/rate-limiter.service'

describe('RateLimiterService', () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  it('allows calls under the limit and blocks once the limit is reached', () => {
    const limiter = new RateLimiterService()

    expect(limiter.checkLimit('player:1:heal', 2, 10_000)).toBe(true)
    expect(limiter.checkLimit('player:1:heal', 2, 10_000)).toBe(true)
    expect(limiter.checkLimit('player:1:heal', 2, 10_000)).toBe(false)
  })

  it('allows a call again once the window has elapsed', () => {
    vi.useFakeTimers()
    vi.setSystemTime(0)
    const limiter = new RateLimiterService()

    expect(limiter.checkLimit('player:1:heal', 1, 1_000)).toBe(true)
    expect(limiter.checkLimit('player:1:heal', 1, 1_000)).toBe(false)

    vi.setSystemTime(1_001)
    expect(limiter.checkLimit('player:1:heal', 1, 1_000)).toBe(true)
  })

  it('cleans up stale keys on a fixed time interval regardless of key count', () => {
    vi.useFakeTimers()
    vi.setSystemTime(0)
    const limiter = new RateLimiterService()

    // A single stale key, well under the 5000-key size threshold.
    limiter.checkLimit('player:1:heal', 1, 1_000)

    // Past both the 60s per-key staleness window and the 60s cleanup interval.
    vi.setSystemTime(61_000)

    // Any call triggers the interval-based sweep; the stale key's window has long
    // since expired, so this must be allowed again even without 5000 tracked keys.
    expect(limiter.checkLimit('player:1:heal', 1, 1_000)).toBe(true)
    expect(limiter.checkLimit('player:2:heal', 1, 1_000)).toBe(true)
  })
})
