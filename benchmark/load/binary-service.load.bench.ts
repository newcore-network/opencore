import { describe, expect, it } from 'vitest'
import {
  createBinaryCallPayload,
  createMockEvent,
  createMockResponse,
} from '../utils/binary-mock'
import { getAllScenarios } from '../utils/load-scenarios'
import { calculateLoadMetrics, reportLoadMetric } from '../utils/metrics'

/**
 * Load benchmarks for BinaryService communication layer.
 *
 * Tests JSON serialization/deserialization throughput, buffer parsing,
 * concurrent pending request management, and event dispatch under load.
 */
describe('BinaryService Load Benchmarks', () => {
  const scenarios = getAllScenarios()

  // ── JSON serialization throughput ────────────────────────────────

  describe('Serialization throughput', () => {
    for (const count of scenarios) {
      it(`Serialize ${count} small call payloads`, () => {
        const payload = createBinaryCallPayload('small')
        const timings: number[] = []

        for (let i = 0; i < count; i++) {
          const start = performance.now()
          JSON.stringify({ ...payload, id: `uuid-${i}` })
          const end = performance.now()
          timings.push(end - start)
        }

        const metrics = calculateLoadMetrics(
          timings,
          `BinaryService - Serialize small payload (${count} ops)`,
          count,
          count,
          0,
        )
        expect(metrics.successCount).toBe(count)
        reportLoadMetric(metrics)
      })

      it(`Serialize ${count} medium call payloads`, () => {
        const payload = createBinaryCallPayload('medium')
        const timings: number[] = []

        for (let i = 0; i < count; i++) {
          const start = performance.now()
          JSON.stringify({ ...payload, id: `uuid-${i}` })
          const end = performance.now()
          timings.push(end - start)
        }

        const metrics = calculateLoadMetrics(
          timings,
          `BinaryService - Serialize medium payload (${count} ops)`,
          count,
          count,
          0,
        )
        expect(metrics.successCount).toBe(count)
        reportLoadMetric(metrics)
      })

      it(`Serialize ${count} large call payloads`, () => {
        const payload = createBinaryCallPayload('large')
        const timings: number[] = []

        for (let i = 0; i < count; i++) {
          const start = performance.now()
          JSON.stringify({ ...payload, id: `uuid-${i}` })
          const end = performance.now()
          timings.push(end - start)
        }

        const metrics = calculateLoadMetrics(
          timings,
          `BinaryService - Serialize large payload (${count} ops)`,
          count,
          count,
          0,
        )
        expect(metrics.successCount).toBe(count)
        reportLoadMetric(metrics)
      })
    }
  })

  // ── JSON parse throughput (response handling) ────────────────────

  describe('Response parse throughput', () => {
    for (const count of scenarios) {
      it(`Parse ${count} ok responses`, () => {
        const responses = Array.from({ length: count }, (_, i) =>
          createMockResponse(`uuid-${i}`, 'ok', { balance: i * 100 }),
        )
        const timings: number[] = []

        for (const raw of responses) {
          const start = performance.now()
          JSON.parse(raw)
          const end = performance.now()
          timings.push(end - start)
        }

        const metrics = calculateLoadMetrics(
          timings,
          `BinaryService - Parse ok responses (${count} ops)`,
          count,
          count,
          0,
        )
        expect(metrics.successCount).toBe(count)
        reportLoadMetric(metrics)
      })

      it(`Parse ${count} mixed responses (ok + error + event)`, () => {
        const responses: string[] = []
        for (let i = 0; i < count; i++) {
          const mod = i % 3
          if (mod === 0) {
            responses.push(createMockResponse(`uuid-${i}`, 'ok', { data: i }))
          } else if (mod === 1) {
            responses.push(createMockResponse(`uuid-${i}`, 'error', undefined, 'fail'))
          } else {
            responses.push(createMockEvent(`event-${i}`, { tick: i }))
          }
        }

        const timings: number[] = []
        for (const raw of responses) {
          const start = performance.now()
          const parsed = JSON.parse(raw)
          // Classify
          if (parsed.type === 'event') { /* event */ }
          else if (parsed.status === 'ok') { /* ok */ }
          else { /* error */ }
          const end = performance.now()
          timings.push(end - start)
        }

        const metrics = calculateLoadMetrics(
          timings,
          `BinaryService - Parse mixed responses (${count} ops)`,
          count,
          count,
          0,
        )
        expect(metrics.successCount).toBe(count)
        reportLoadMetric(metrics)
      })
    }
  })

  // ── Buffer line splitting under load ─────────────────────────────

  describe('Buffer line splitting', () => {
    for (const count of scenarios) {
      it(`Split buffer with ${count} lines`, () => {
        const lines = Array.from({ length: count }, (_, i) =>
          createMockResponse(`uuid-${i}`, 'ok', i),
        )
        const rawBuffer = lines.join('\n') + '\n'

        const timings: number[] = []
        const start = performance.now()

        let buffer = rawBuffer
        let parsed = 0
        let idx = buffer.indexOf('\n')
        while (idx !== -1) {
          const line = buffer.slice(0, idx).trim()
          buffer = buffer.slice(idx + 1)
          if (line) {
            JSON.parse(line)
            parsed++
          }
          idx = buffer.indexOf('\n')
        }

        const end = performance.now()
        timings.push(end - start)

        expect(parsed).toBe(count)

        const metrics = calculateLoadMetrics(
          timings,
          `BinaryService - Buffer split + parse (${count} lines)`,
          count,
          1,
          0,
        )
        reportLoadMetric(metrics)
      })

      it(`Split fragmented buffer (${count} chunks of 2 fragments each)`, () => {
        const timings: number[] = []

        for (let i = 0; i < count; i++) {
          const full = createMockResponse(`uuid-${i}`, 'ok', i)
          const mid = Math.floor(full.length / 2)
          const frag1 = full.slice(0, mid)
          const frag2 = full.slice(mid) + '\n'

          const start = performance.now()
          let buffer = ''
          buffer += frag1
          // No newline yet
          let idx = buffer.indexOf('\n')
          if (idx === -1) {
            buffer += frag2
            idx = buffer.indexOf('\n')
            if (idx !== -1) {
              const line = buffer.slice(0, idx).trim()
              buffer = buffer.slice(idx + 1)
              if (line) JSON.parse(line)
            }
          }
          const end = performance.now()
          timings.push(end - start)
        }

        const metrics = calculateLoadMetrics(
          timings,
          `BinaryService - Fragmented buffer (${count} fragments)`,
          count,
          count,
          0,
        )
        expect(metrics.successCount).toBe(count)
        reportLoadMetric(metrics)
      })
    }
  })

  // ── Pending request map operations under load ────────────────────

  describe('Pending request management', () => {
    for (const count of scenarios) {
      it(`Manage ${count} concurrent pending requests`, () => {
        const pending = new Map<string, { resolve: Function; reject: Function; timeout?: ReturnType<typeof setTimeout> }>()
        const timings: number[] = []

        // Register all pending
        const registerStart = performance.now()
        for (let i = 0; i < count; i++) {
          pending.set(`req-${i}`, {
            resolve: () => {},
            reject: () => {},
            timeout: setTimeout(() => {}, 15000),
          })
        }
        const registerEnd = performance.now()
        timings.push(registerEnd - registerStart)

        // Resolve all pending (simulate responses arriving)
        const resolveStart = performance.now()
        for (let i = 0; i < count; i++) {
          const req = pending.get(`req-${i}`)
          if (req) {
            if (req.timeout) clearTimeout(req.timeout)
            req.resolve({ result: i })
            pending.delete(`req-${i}`)
          }
        }
        const resolveEnd = performance.now()
        timings.push(resolveEnd - resolveStart)

        expect(pending.size).toBe(0)

        const metrics = calculateLoadMetrics(
          timings,
          `BinaryService - Pending requests lifecycle (${count} requests)`,
          count,
          2,
          0,
        )
        reportLoadMetric(metrics)
      })
    }
  })

  // ── Event handler dispatch under load ────────────────────────────

  describe('Event dispatch', () => {
    for (const count of scenarios) {
      it(`Dispatch ${count} events to matching handlers`, () => {
        const handlers = new Map<string, (data?: unknown) => void>()
        // Register 20 different event handlers
        for (let i = 0; i < 20; i++) {
          handlers.set(`event-${i}`, () => {})
        }

        const timings: number[] = []
        for (let i = 0; i < count; i++) {
          const eventName = `event-${i % 20}`
          const start = performance.now()
          const handler = handlers.get(eventName)
          if (handler) handler({ tick: i })
          const end = performance.now()
          timings.push(end - start)
        }

        const metrics = calculateLoadMetrics(
          timings,
          `BinaryService - Event dispatch (${count} events, 20 handlers)`,
          count,
          count,
          0,
        )
        expect(metrics.successCount).toBe(count)
        reportLoadMetric(metrics)
      })
    }
  })

  // ── Full round-trip simulation ───────────────────────────────────

  describe('Full round-trip', () => {
    for (const count of scenarios) {
      it(`Full round-trip ${count} calls (serialize → parse → route)`, () => {
        const timings: number[] = []

        for (let i = 0; i < count; i++) {
          const start = performance.now()

          // 1. Serialize call
          const callPayload = JSON.stringify({ id: `rt-${i}`, action: 'getBalance', params: [i] })

          // 2. Simulate binary response
          const responseRaw = createMockResponse(`rt-${i}`, 'ok', { balance: i * 100 })

          // 3. Parse response
          const parsed = JSON.parse(responseRaw)

          // 4. Route response
          if (parsed.type === 'event') { /* event path */ }
          else if (parsed.status === 'ok') { /* success path */ }
          else { /* error path */ }

          const end = performance.now()
          timings.push(end - start)
        }

        const metrics = calculateLoadMetrics(
          timings,
          `BinaryService - Full round-trip (${count} calls)`,
          count,
          count,
          0,
        )
        expect(metrics.successCount).toBe(count)
        reportLoadMetric(metrics)
      })
    }
  })
})
