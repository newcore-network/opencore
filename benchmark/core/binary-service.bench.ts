import { Bench } from 'tinybench'
import {
  createBinaryCallPayload,
  createMockBinaryEntry,
  createMockEvent,
  createMockResponse,
} from '../utils/binary-mock'

/**
 * Benchmarks for BinaryService internals.
 *
 * Measures the pure logic overhead of the binary process communication layer
 * without spawning real OS processes.
 */
export async function runBinaryServiceBenchmark(): Promise<Bench> {
  const bench = new Bench({ time: 1000 })

  // ── JSON serialization of call payloads ──────────────────────────

  const smallPayload = createBinaryCallPayload('small')
  const mediumPayload = createBinaryCallPayload('medium')
  const largePayload = createBinaryCallPayload('large')

  bench.add('BinaryService - Serialize call payload (small)', () => {
    JSON.stringify(smallPayload)
  })

  bench.add('BinaryService - Serialize call payload (medium)', () => {
    JSON.stringify(mediumPayload)
  })

  bench.add('BinaryService - Serialize call payload (large)', () => {
    JSON.stringify(largePayload)
  })

  // ── JSON parsing of responses ────────────────────────────────────

  const okResponseRaw = createMockResponse('uuid-001', 'ok', { balance: 5000 })
  const errorResponseRaw = createMockResponse('uuid-002', 'error', undefined, 'Something failed')
  const eventRaw = createMockEvent('playerSync', { id: 1, pos: { x: 100, y: 200, z: 72 } })

  bench.add('BinaryService - Parse JSON response (ok)', () => {
    JSON.parse(okResponseRaw)
  })

  bench.add('BinaryService - Parse JSON response (error)', () => {
    JSON.parse(errorResponseRaw)
  })

  bench.add('BinaryService - Parse JSON event message', () => {
    JSON.parse(eventRaw)
  })

  // ── Response routing (classify ok vs error vs event) ─────────────

  const parsedOk = JSON.parse(okResponseRaw)
  const parsedError = JSON.parse(errorResponseRaw)
  const parsedEvent = JSON.parse(eventRaw)

  bench.add('BinaryService - Classify response type (ok/error/event)', () => {
    classifyResponse(parsedOk)
    classifyResponse(parsedError)
    classifyResponse(parsedEvent)
  })

  // ── Buffer line splitting (handleStdout logic) ───────────────────

  const singleLine = Buffer.from(okResponseRaw + '\n')
  const multiLine = Buffer.from(
    [
      createMockResponse('id-1', 'ok', 1),
      createMockResponse('id-2', 'ok', 2),
      createMockResponse('id-3', 'ok', 3),
      createMockEvent('tick', { frame: 1 }),
      createMockResponse('id-4', 'ok', 4),
    ].join('\n') + '\n',
  )

  bench.add('BinaryService - Buffer split single line', () => {
    splitBuffer(singleLine.toString())
  })

  bench.add('BinaryService - Buffer split 5 lines', () => {
    splitBuffer(multiLine.toString())
  })

  // Fragmented chunks (partial line across two chunks)
  const fragment1 = '{"id":"uuid-100","status":'
  const fragment2 = '"ok","result":42}\n'

  bench.add('BinaryService - Buffer split fragmented chunks', () => {
    let buffer = ''
    buffer += fragment1
    // First chunk: no newline yet
    const idx1 = buffer.indexOf('\n')
    if (idx1 === -1) {
      // expected: no complete line
    }
    buffer += fragment2
    splitBuffer(buffer)
  })

  // ── Pending request map operations ───────────────────────────────

  bench.add('BinaryService - Pending map set + get + delete (10 requests)', () => {
    const pending = new Map<string, { resolve: Function; reject: Function }>()
    for (let i = 0; i < 10; i++) {
      const id = `req-${i}`
      pending.set(id, { resolve: noop, reject: noop })
    }
    for (let i = 0; i < 10; i++) {
      const id = `req-${i}`
      pending.get(id)
      pending.delete(id)
    }
  })

  bench.add('BinaryService - Pending map set + get + delete (100 requests)', () => {
    const pending = new Map<string, { resolve: Function; reject: Function }>()
    for (let i = 0; i < 100; i++) {
      const id = `req-${i}`
      pending.set(id, { resolve: noop, reject: noop })
    }
    for (let i = 0; i < 100; i++) {
      const id = `req-${i}`
      pending.get(id)
      pending.delete(id)
    }
  })

  // ── Event handler dispatch ───────────────────────────────────────

  bench.add('BinaryService - Event dispatch (1 handler)', () => {
    const handlers = new Map<string, (data?: unknown) => void>()
    handlers.set('onSync', noop)
    const handler = handlers.get('onSync')
    if (handler) handler({ frame: 1 })
  })

  const manyHandlers = new Map<string, (data?: unknown) => void>()
  for (let i = 0; i < 20; i++) {
    manyHandlers.set(`event-${i}`, noop)
  }

  bench.add('BinaryService - Event dispatch lookup (20 handlers)', () => {
    const handler = manyHandlers.get('event-15')
    if (handler) handler({ data: 'test' })
  })

  // ── Full round-trip simulation (serialize → parse → route) ──────

  bench.add('BinaryService - Full round-trip (serialize + parse + classify)', () => {
    const payload = JSON.stringify({ id: 'rt-001', action: 'getBalance', params: [123] })
    const response = JSON.stringify({ id: 'rt-001', status: 'ok', result: 5000 })
    JSON.parse(payload)
    const parsed = JSON.parse(response)
    classifyResponse(parsed)
  })

  return bench
}

// ── Helpers ──────────────────────────────────────────────────────────

function noop() {}

function classifyResponse(parsed: any): 'ok' | 'error' | 'event' | 'unknown' {
  if (parsed?.type === 'event') return 'event'
  if (parsed?.status === 'ok') return 'ok'
  if (parsed?.status === 'error') return 'error'
  return 'unknown'
}

function splitBuffer(raw: string): string[] {
  const lines: string[] = []
  let buffer = raw
  let idx = buffer.indexOf('\n')
  while (idx !== -1) {
    const line = buffer.slice(0, idx).trim()
    buffer = buffer.slice(idx + 1)
    if (line) lines.push(line)
    idx = buffer.indexOf('\n')
  }
  return lines
}
