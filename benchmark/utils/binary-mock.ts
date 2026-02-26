import { EventEmitter } from 'node:events'

/**
 * Minimal mock of a writable stream (stdin) for benchmark purposes.
 * Does not spawn any real process.
 */
export class MockWritableStream extends EventEmitter {
  writable = true
  private chunks: string[] = []

  write(data: string): boolean {
    this.chunks.push(data)
    return true
  }

  getWrittenData(): string[] {
    return this.chunks
  }

  clear(): void {
    this.chunks = []
  }

  end(): void {
    this.writable = false
  }
}

/**
 * Minimal mock of a readable stream (stdout) for benchmark purposes.
 */
export class MockReadableStream extends EventEmitter {
  readable = true

  /**
   * Simulates the binary writing a line to stdout.
   */
  pushLine(line: string): void {
    this.emit('data', Buffer.from(`${line}\n`))
  }

  /**
   * Simulates a partial chunk (no trailing newline).
   */
  pushChunk(chunk: string): void {
    this.emit('data', Buffer.from(chunk))
  }
}

/**
 * Mock ChildProcess that simulates a binary process for benchmarking
 * without spawning any real OS process.
 */
export class MockChildProcess extends EventEmitter {
  readonly pid = 99999
  stdin: MockWritableStream
  stdout: MockReadableStream
  stderr: MockReadableStream

  constructor() {
    super()
    this.stdin = new MockWritableStream()
    this.stdout = new MockReadableStream()
    this.stderr = new MockReadableStream()
  }

  kill(): boolean {
    this.emit('exit', 0, null)
    return true
  }
}

/**
 * Creates a BinaryServiceEntry-like object for benchmarking internal methods
 * of BinaryProcessManager without DI or real processes.
 */
export function createMockBinaryEntry(name: string, options?: { timeoutMs?: number }) {
  const child = new MockChildProcess()
  return {
    name,
    binary: name,
    timeoutMs: options?.timeoutMs ?? 15000,
    status: 'online' as const,
    binaryPath: `/mock/bin/${name}`,
    process: child as any,
    pending: new Map<string, { resolve: (v: unknown) => void; reject: (e: Error) => void; timeout?: ReturnType<typeof setTimeout> }>(),
    eventHandlers: new Map<string, (data?: unknown) => void>(),
    buffer: '',
    serviceClass: class MockService {},
    _mock: child,
  }
}

/**
 * Generates a valid JSON response line as a binary process would emit.
 */
export function createMockResponse(id: string, status: 'ok' | 'error', result?: unknown, error?: unknown): string {
  if (status === 'ok') {
    return JSON.stringify({ id, status: 'ok', result })
  }
  return JSON.stringify({ id, status: 'error', error })
}

/**
 * Generates a valid JSON event line as a binary process would emit.
 */
export function createMockEvent(event: string, data?: unknown): string {
  return JSON.stringify({ type: 'event', event, data })
}

/**
 * Generates payloads of varying sizes for serialization benchmarks.
 */
export function createBinaryCallPayload(size: 'small' | 'medium' | 'large'): { id: string; action: string; params: unknown[] } {
  switch (size) {
    case 'small':
      return { id: 'uuid-001', action: 'ping', params: [] }
    case 'medium':
      return {
        id: 'uuid-002',
        action: 'transfer',
        params: [123, 456, 5000, { source: 'bank', verified: true }],
      }
    case 'large':
      return {
        id: 'uuid-003',
        action: 'bulkUpdate',
        params: [
          Array.from({ length: 100 }, (_, i) => ({
            id: i,
            name: `Player${i}`,
            position: { x: Math.random() * 1000, y: Math.random() * 1000, z: 72.0 },
            inventory: Array.from({ length: 20 }, (_, j) => ({ id: j, name: `Item${j}`, qty: Math.floor(Math.random() * 100) })),
          })),
        ],
      }
  }
}
