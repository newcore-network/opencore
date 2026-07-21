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

  it('does not remove hits that are still within a longer configured window', () => {
    vi.useFakeTimers()
    vi.setSystemTime(0)
    const limiter = new RateLimiterService()

    expect(limiter.checkLimit('player:1:heal', 1, 120_000)).toBe(true)

    // Trigger the periodic cleanup after one minute with another key.
    vi.setSystemTime(61_000)
    expect(limiter.checkLimit('player:2:heal', 1, 1_000)).toBe(true)

    // The original two-minute throttle must still be enforced.
    expect(limiter.checkLimit('player:1:heal', 1, 120_000)).toBe(false)
  })

  it('retains hits for a longer window when the same key is checked with a shorter one', () => {
    vi.useFakeTimers()
    vi.setSystemTime(0)
    const limiter = new RateLimiterService()

    expect(limiter.checkLimit('player:1:heal', 2, 120_000)).toBe(true)

    vi.setSystemTime(61_000)
    expect(limiter.checkLimit('player:1:heal', 2, 1_000)).toBe(true)

    // The initial hit still belongs to the retained two-minute window.
    expect(limiter.checkLimit('player:1:heal', 2, 120_000)).toBe(false)
  })
})
