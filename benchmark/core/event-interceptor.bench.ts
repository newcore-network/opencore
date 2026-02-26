import { Bench } from 'tinybench'
import { EventInterceptorService } from '../../src/runtime/server/devmode/event-interceptor.service'

/**
 * Benchmarks for the DevMode EventInterceptor: recording, circular buffer,
 * filtering, statistics, and listener notification overhead.
 */
export async function runEventInterceptorBenchmark(): Promise<Bench> {
  const bench = new Bench({ time: 1000 })

  // ── Record single events ─────────────────────────────────────────

  bench.add('EventInterceptor - recordNetEvent (single)', () => {
    const interceptor = new EventInterceptorService()
    interceptor.configure({ enabled: true, recordHistory: true, maxHistorySize: 1000 })
    interceptor.recordNetEvent('player:sync', 'in', [{ x: 100, y: 200 }], { clientId: 1 })
  })

  bench.add('EventInterceptor - recordCommand (single)', () => {
    const interceptor = new EventInterceptorService()
    interceptor.configure({ enabled: true, recordHistory: true, maxHistorySize: 1000 })
    interceptor.recordCommand('heal', ['100'], { clientId: 1 })
  })

  bench.add('EventInterceptor - recordExport (single)', () => {
    const interceptor = new EventInterceptorService()
    interceptor.configure({ enabled: true, recordHistory: true, maxHistorySize: 1000 })
    interceptor.recordExport('getPlayerData', [1])
  })

  // ── Complete / Fail events ───────────────────────────────────────

  bench.add('EventInterceptor - record + complete event', () => {
    const interceptor = new EventInterceptorService()
    interceptor.configure({ enabled: true, recordHistory: true, maxHistorySize: 1000 })
    const startTime = Date.now()
    const id = interceptor.recordNetEvent('test:event', 'in', ['data'])
    interceptor.completeEvent(id, { success: true }, startTime)
  })

  bench.add('EventInterceptor - record + fail event', () => {
    const interceptor = new EventInterceptorService()
    interceptor.configure({ enabled: true, recordHistory: true, maxHistorySize: 1000 })
    const startTime = Date.now()
    const id = interceptor.recordNetEvent('test:event', 'in', ['data'])
    interceptor.failEvent(id, 'Something went wrong', startTime)
  })

  // ── Circular buffer pressure ─────────────────────────────────────

  bench.add('EventInterceptor - 100 events (within buffer)', () => {
    const interceptor = new EventInterceptorService()
    interceptor.configure({ enabled: true, recordHistory: true, maxHistorySize: 1000 })
    for (let i = 0; i < 100; i++) {
      interceptor.recordNetEvent(`event-${i}`, 'in', [i])
    }
  })

  bench.add('EventInterceptor - 1000 events (fill buffer)', () => {
    const interceptor = new EventInterceptorService()
    interceptor.configure({ enabled: true, recordHistory: true, maxHistorySize: 1000 })
    for (let i = 0; i < 1000; i++) {
      interceptor.recordNetEvent(`event-${i}`, 'in', [i])
    }
  })

  bench.add('EventInterceptor - 1500 events (overflow buffer, maxSize=1000)', () => {
    const interceptor = new EventInterceptorService()
    interceptor.configure({ enabled: true, recordHistory: true, maxHistorySize: 1000 })
    for (let i = 0; i < 1500; i++) {
      interceptor.recordNetEvent(`event-${i}`, 'in', [i])
    }
  })

  // ── Filtering ────────────────────────────────────────────────────

  const prefilledInterceptor = new EventInterceptorService()
  prefilledInterceptor.configure({ enabled: true, recordHistory: true, maxHistorySize: 2000 })
  for (let i = 0; i < 500; i++) {
    prefilledInterceptor.recordNetEvent(`net-${i}`, 'in', [i])
  }
  for (let i = 0; i < 300; i++) {
    prefilledInterceptor.recordCommand(`cmd-${i}`, [`arg-${i}`])
  }
  for (let i = 0; i < 200; i++) {
    prefilledInterceptor.recordExport(`export-${i}`, [i])
  }

  bench.add('EventInterceptor - getEventsByType (1000 events, filter "net")', () => {
    prefilledInterceptor.getEventsByType('net')
  })

  bench.add('EventInterceptor - getEventsByType (1000 events, filter "command")', () => {
    prefilledInterceptor.getEventsByType('command')
  })

  bench.add('EventInterceptor - getEventsByTimeRange (1000 events)', () => {
    const now = Date.now()
    prefilledInterceptor.getEventsByTimeRange(now - 60000, now)
  })

  bench.add('EventInterceptor - getEventHistory (1000 events, full copy)', () => {
    prefilledInterceptor.getEventHistory()
  })

  // ── Statistics ───────────────────────────────────────────────────

  bench.add('EventInterceptor - getStatistics (1000 events)', () => {
    prefilledInterceptor.getStatistics()
  })

  // ── Listener notification ────────────────────────────────────────

  bench.add('EventInterceptor - notify 1 listener per event (10 events)', () => {
    const interceptor = new EventInterceptorService()
    interceptor.configure({ enabled: true, recordHistory: false, maxHistorySize: 100 })
    let count = 0
    interceptor.addListener(() => { count++ })
    for (let i = 0; i < 10; i++) {
      interceptor.recordNetEvent(`event-${i}`, 'in', [i])
    }
  })

  bench.add('EventInterceptor - notify 5 listeners per event (10 events)', () => {
    const interceptor = new EventInterceptorService()
    interceptor.configure({ enabled: true, recordHistory: false, maxHistorySize: 100 })
    let count = 0
    for (let l = 0; l < 5; l++) {
      interceptor.addListener(() => { count++ })
    }
    for (let i = 0; i < 10; i++) {
      interceptor.recordNetEvent(`event-${i}`, 'in', [i])
    }
  })

  bench.add('EventInterceptor - notify 10 listeners per event (10 events)', () => {
    const interceptor = new EventInterceptorService()
    interceptor.configure({ enabled: true, recordHistory: false, maxHistorySize: 100 })
    let count = 0
    for (let l = 0; l < 10; l++) {
      interceptor.addListener(() => { count++ })
    }
    for (let i = 0; i < 10; i++) {
      interceptor.recordNetEvent(`event-${i}`, 'in', [i])
    }
  })

  // ── Disabled interceptor (overhead when off) ─────────────────────

  bench.add('EventInterceptor - disabled (100 events, no-op)', () => {
    const interceptor = new EventInterceptorService()
    interceptor.configure({ enabled: false, recordHistory: false, maxHistorySize: 100 })
    for (let i = 0; i < 100; i++) {
      interceptor.recordNetEvent(`event-${i}`, 'in', [i])
    }
  })

  // ── clearHistory ─────────────────────────────────────────────────

  bench.add('EventInterceptor - clearHistory (1000 events)', () => {
    const interceptor = new EventInterceptorService()
    interceptor.configure({ enabled: true, recordHistory: true, maxHistorySize: 1000 })
    for (let i = 0; i < 1000; i++) {
      interceptor.recordNetEvent(`event-${i}`, 'in', [i])
    }
    interceptor.clearHistory()
  })

  return bench
}
