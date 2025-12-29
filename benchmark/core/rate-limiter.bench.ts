import { Bench } from 'tinybench'
import { RateLimiterService } from '../../src/runtime/server/services/rate-limiter.service'

export async function runRateLimiterBenchmark(): Promise<Bench> {
  const bench = new Bench({ time: 1000 })

  bench.add('RateLimiter - Single key check', async () => {
    const service = new RateLimiterService()
    service.checkLimit('player:1:command', 10, 1000)
  })

  bench.add('RateLimiter - 10 different keys', async () => {
    const service = new RateLimiterService()
    for (let i = 0; i < 10; i++) {
      service.checkLimit(`player:${i}:command`, 10, 1000)
    }
  })

  bench.add('RateLimiter - 100 different keys', async () => {
    const service = new RateLimiterService()
    for (let i = 0; i < 100; i++) {
      service.checkLimit(`player:${i}:command`, 10, 1000)
    }
  })

  bench.add('RateLimiter - Same key 100 times (within limit)', async () => {
    const service = new RateLimiterService()
    const key = 'player:1:command'
    for (let i = 0; i < 10; i++) {
      service.checkLimit(key, 10, 1000)
    }
  })

  bench.add('RateLimiter - Cleanup trigger (5000+ keys)', async () => {
    const service = new RateLimiterService()
    // Llenar hasta el límite de cleanup
    for (let i = 0; i < 5001; i++) {
      service.checkLimit(`player:${i}:command`, 10, 1000)
    }
    // Esta llamada debería trigger cleanup
    service.checkLimit('player:5001:command', 10, 1000)
  })

  bench.add('RateLimiter - Window expiration check', async () => {
    const service = new RateLimiterService()
    const key = 'player:1:command'
    const now = Date.now()
    const oldTimestamps = Array.from({ length: 5 }, (_, i) => now - 2000 - i * 100)
    // @ts-expect-error - private access for benchmark
    service.hits.set(key, oldTimestamps)

    service.checkLimit(key, 10, 1000)
  })

  return bench
}
