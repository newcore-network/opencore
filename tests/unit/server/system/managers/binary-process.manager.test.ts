import 'reflect-metadata'
import { EventEmitter } from 'node:events'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { container, injectable } from 'tsyringe'
import { BinaryCall } from '../../../../../src/runtime/server/decorators/binaryCall'
import { BinaryEvent } from '../../../../../src/runtime/server/decorators/binaryEvent'
import { IResourceInfo } from '../../../../../src/adapters/contracts/IResourceInfo'
import { BinaryProcessManager } from '../../../../../src/runtime/server/system/managers/binary-process.manager'

vi.mock('node:fs', () => ({
  default: {
    existsSync: vi.fn(() => true),
  },
}))

interface MockChildProcess extends EventEmitter {
  stdin: { write: ReturnType<typeof vi.fn>; on: ReturnType<typeof vi.fn> }
  stdout: EventEmitter
  stderr: EventEmitter
  pid: number
  kill: ReturnType<typeof vi.fn>
}

let latestMockProcess: MockChildProcess

function createMockProcess(): MockChildProcess {
  const proc = Object.assign(new EventEmitter(), {
    stdin: { write: vi.fn(() => true), on: vi.fn() },
    stdout: new EventEmitter(),
    stderr: new EventEmitter(),
    pid: 12345,
    kill: vi.fn(),
  })
  latestMockProcess = proc
  return proc
}

vi.mock('node:child_process', () => ({
  spawn: vi.fn(() => createMockProcess()),
}))

vi.mock('../../../../../src/kernel/logger', () => ({
  loggers: {
    bootstrap: {
      debug: vi.fn(),
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
    },
  },
}))

vi.mock('uuid', () => ({
  v4: vi.fn(() => 'test-uuid-1234'),
}))

class MockResourceInfo extends IResourceInfo {
  getCurrentResourceName(): string {
    return 'test-resource'
  }
  getCurrentResourcePath(): string {
    return '/fake/resource/path'
  }
}

function createManager(): BinaryProcessManager {
  container.reset()
  container.registerInstance(IResourceInfo as any, new MockResourceInfo())
  return container.resolve(BinaryProcessManager)
}

function emitStdout(data: string): void {
  latestMockProcess.stdout.emit('data', Buffer.from(data))
}

const flushMicrotasks = () => new Promise<void>((r) => queueMicrotask(r))

@injectable()
class SimpleService {
  @BinaryCall()
  getStatus(): any {
    return null
  }

  @BinaryCall({ action: 'custom_action', timeoutMs: 2000 })
  doWork(): any {
    return null
  }
}

@injectable()
class EventService {
  @BinaryCall()
  ping(): any {
    return null
  }

  @BinaryEvent({ event: 'detection' })
  onDetection(_data?: unknown) {}

  @BinaryEvent()
  onHeartbeat(_data?: unknown) {}
}

@injectable()
class ThrowingEventService {
  @BinaryEvent({ event: 'bad-event' })
  onBadEvent(_data?: unknown) {
    throw new Error('Handler exploded')
  }
}

describe('BinaryProcessManager', () => {
  let manager: BinaryProcessManager

  beforeEach(() => {
    vi.clearAllMocks()
    manager = createManager()
  })

  afterEach(() => {
    container.reset()
  })

  describe('register', () => {
    it('should register a service and spawn the process', async () => {
      const { spawn } = await import('node:child_process')

      manager.register({ name: 'test-svc', binary: 'test-bin' }, SimpleService)

      expect(spawn).toHaveBeenCalled()
    })

    it('should skip duplicate service names', async () => {
      const { loggers } = await import('../../../../../src/kernel/logger')

      manager.register({ name: 'dup-svc', binary: 'bin-a' }, SimpleService)
      manager.register({ name: 'dup-svc', binary: 'bin-b' }, SimpleService)

      expect(loggers.bootstrap.warn).toHaveBeenCalledWith(
        expect.stringContaining('Duplicate service name'),
        expect.any(Object),
      )
    })

    it('should set status to missing when binary is not found', async () => {
      const fs = await import('node:fs')
      vi.mocked(fs.default.existsSync).mockReturnValue(false)

      const { loggers } = await import('../../../../../src/kernel/logger')

      manager.register({ name: 'missing-svc', binary: 'nonexistent' }, SimpleService)

      expect(loggers.bootstrap.error).toHaveBeenCalledWith(
        expect.stringContaining('Binary not found'),
        expect.any(Object),
      )

      vi.mocked(fs.default.existsSync).mockReturnValue(true)
    })
  })

  describe('call (request-response)', () => {
    it('should send JSON payload to stdin', async () => {
      manager.register({ name: 'call-svc', binary: 'call-bin' }, SimpleService)

      const promise = manager.call('call-svc', 'getStatus', [])
      await flushMicrotasks()

      expect(latestMockProcess.stdin.write).toHaveBeenCalledWith(
        expect.stringContaining('"action":"getStatus"'),
      )

      emitStdout(`${JSON.stringify({ id: 'test-uuid-1234', status: 'ok', result: null })}\n`)
      await promise
    })

    it('should resolve when binary responds with ok', async () => {
      manager.register({ name: 'ok-svc', binary: 'ok-bin' }, SimpleService)

      const promise = manager.call('ok-svc', 'getStatus', [])
      await flushMicrotasks()

      emitStdout(
        `${JSON.stringify({
          id: 'test-uuid-1234',
          status: 'ok',
          result: { alive: true },
        })}\n`,
      )

      const result = await promise
      expect(result).toEqual({ alive: true })
    })

    it('should reject when binary responds with error', async () => {
      manager.register({ name: 'err-svc', binary: 'err-bin' }, SimpleService)

      const promise = manager.call('err-svc', 'getStatus', [])
      await flushMicrotasks()

      emitStdout(
        `${JSON.stringify({
          id: 'test-uuid-1234',
          status: 'error',
          error: 'Something went wrong',
        })}\n`,
      )

      await expect(promise).rejects.toThrow('Something went wrong')
    })

    it('should reject when service is not available', async () => {
      await expect(manager.call('nonexistent', 'action', [])).rejects.toThrow(/not available/)
    })

    it('should reject on timeout', async () => {
      vi.useFakeTimers()

      manager.register(
        { name: 'timeout-svc', binary: 'timeout-bin', timeoutMs: 100 },
        SimpleService,
      )

      const promise = manager.call('timeout-svc', 'getStatus', [], 100)
      await flushMicrotasks()

      vi.advanceTimersByTime(150)

      await expect(promise).rejects.toThrow(/timeout/)

      vi.useRealTimers()
    })
  })

  describe('BinaryCall proxy', () => {
    it('should proxy calls with default action name', async () => {
      manager.register({ name: 'proxy-svc', binary: 'proxy-bin' }, SimpleService)

      const promise = manager.call('proxy-svc', 'getStatus', ['arg1'])
      await flushMicrotasks()

      expect(latestMockProcess.stdin.write).toHaveBeenCalledWith(
        expect.stringContaining('"action":"getStatus"'),
      )

      emitStdout(`${JSON.stringify({ id: 'test-uuid-1234', status: 'ok', result: 'ok' })}\n`)
      await promise
    })

    it('should proxy calls with custom action name', async () => {
      manager.register({ name: 'action-svc', binary: 'action-bin' }, SimpleService)

      const promise = manager.call('action-svc', 'custom_action', [])
      await flushMicrotasks()

      expect(latestMockProcess.stdin.write).toHaveBeenCalledWith(
        expect.stringContaining('"action":"custom_action"'),
      )

      emitStdout(`${JSON.stringify({ id: 'test-uuid-1234', status: 'ok', result: 'ok' })}\n`)
      await promise
    })
  })

  describe('event dispatch', () => {
    it('should dispatch event to registered handler', () => {
      const spy = vi.spyOn(EventService.prototype, 'onDetection')
      manager.register({ name: 'event-svc', binary: 'event-bin' }, EventService)

      emitStdout(
        `${JSON.stringify({
          type: 'event',
          event: 'detection',
          data: { playerId: 42, reason: 'speedhack' },
        })}\n`,
      )

      expect(spy).toHaveBeenCalledWith({ playerId: 42, reason: 'speedhack' })
      spy.mockRestore()
    })

    it('should dispatch event using method name as default event name', () => {
      const spy = vi.spyOn(EventService.prototype, 'onHeartbeat')
      manager.register({ name: 'heartbeat-svc', binary: 'heartbeat-bin' }, EventService)

      emitStdout(
        `${JSON.stringify({
          type: 'event',
          event: 'onHeartbeat',
          data: { ts: 123 },
        })}\n`,
      )

      expect(spy).toHaveBeenCalledWith({ ts: 123 })
      spy.mockRestore()
    })

    it('should warn when event has no registered handler', async () => {
      const { loggers } = await import('../../../../../src/kernel/logger')

      manager.register({ name: 'no-handler-svc', binary: 'no-handler-bin' }, EventService)

      emitStdout(
        `${JSON.stringify({
          type: 'event',
          event: 'unknown-event',
          data: null,
        })}\n`,
      )

      expect(loggers.bootstrap.warn).toHaveBeenCalledWith(
        expect.stringContaining('unhandled event'),
        expect.objectContaining({ event: 'unknown-event' }),
      )
    })

    it('should not interfere with request-response flow', async () => {
      const spy = vi.spyOn(EventService.prototype, 'onDetection')
      manager.register({ name: 'mixed-svc', binary: 'mixed-bin' }, EventService)

      // Event message should be dispatched
      emitStdout(
        `${JSON.stringify({
          type: 'event',
          event: 'detection',
          data: { info: 'event-data' },
        })}\n`,
      )

      expect(spy).toHaveBeenCalledTimes(1)

      // Response message should resolve the pending call
      const promise = manager.call('mixed-svc', 'getStatus', [])
      await flushMicrotasks()
      emitStdout(
        `${JSON.stringify({
          id: 'test-uuid-1234',
          status: 'ok',
          result: 'pong',
        })}\n`,
      )

      const result = await promise
      expect(result).toBe('pong')
      spy.mockRestore()
    })

    it('should catch and log errors thrown by event handlers', async () => {
      const { loggers } = await import('../../../../../src/kernel/logger')

      manager.register({ name: 'throw-svc', binary: 'throw-bin' }, ThrowingEventService)

      emitStdout(
        `${JSON.stringify({
          type: 'event',
          event: 'bad-event',
          data: {},
        })}\n`,
      )

      expect(loggers.bootstrap.error).toHaveBeenCalledWith(
        expect.stringContaining('event handler error'),
        expect.objectContaining({ event: 'bad-event', error: 'Handler exploded' }),
      )
    })

    it('should handle event with no data field', () => {
      const spy = vi.spyOn(EventService.prototype, 'onDetection')
      manager.register({ name: 'nodata-svc', binary: 'nodata-bin' }, EventService)

      emitStdout(
        `${JSON.stringify({
          type: 'event',
          event: 'detection',
        })}\n`,
      )

      expect(spy).toHaveBeenCalledWith(undefined)
      spy.mockRestore()
    })
  })

  describe('stdout parsing', () => {
    it('should handle multiple JSON lines in a single chunk', () => {
      const spy = vi.spyOn(EventService.prototype, 'onDetection')
      manager.register({ name: 'multi-svc', binary: 'multi-bin' }, EventService)

      const line1 = JSON.stringify({ type: 'event', event: 'detection', data: { n: 1 } })
      const line2 = JSON.stringify({ type: 'event', event: 'detection', data: { n: 2 } })

      emitStdout(`${line1}\n${line2}\n`)

      expect(spy).toHaveBeenCalledTimes(2)
      expect(spy).toHaveBeenNthCalledWith(1, { n: 1 })
      expect(spy).toHaveBeenNthCalledWith(2, { n: 2 })
      spy.mockRestore()
    })

    it('should handle partial chunks (buffering)', () => {
      const spy = vi.spyOn(EventService.prototype, 'onDetection')
      manager.register({ name: 'partial-svc', binary: 'partial-bin' }, EventService)

      const fullLine = JSON.stringify({ type: 'event', event: 'detection', data: { ok: true } })
      const half1 = fullLine.slice(0, 20)
      const half2 = `${fullLine.slice(20)}\n`

      emitStdout(half1)
      expect(spy).not.toHaveBeenCalled()

      emitStdout(half2)
      expect(spy).toHaveBeenCalledWith({ ok: true })
      spy.mockRestore()
    })

    it('should warn on invalid JSON', async () => {
      const { loggers } = await import('../../../../../src/kernel/logger')

      manager.register({ name: 'bad-json-svc', binary: 'bad-json-bin' }, SimpleService)

      emitStdout('this is not json\n')

      expect(loggers.bootstrap.warn).toHaveBeenCalledWith(
        expect.stringContaining('invalid JSON'),
        expect.any(Object),
      )
    })

    it('should warn on response missing id (non-event)', async () => {
      const { loggers } = await import('../../../../../src/kernel/logger')

      manager.register({ name: 'noid-svc', binary: 'noid-bin' }, SimpleService)

      emitStdout(`${JSON.stringify({ status: 'ok', result: 'orphan' })}\n`)

      expect(loggers.bootstrap.warn).toHaveBeenCalledWith(
        expect.stringContaining('response missing id'),
        expect.any(Object),
      )
    })
  })

  describe('process lifecycle', () => {
    it('should log error when process exits', async () => {
      const { loggers } = await import('../../../../../src/kernel/logger')

      manager.register({ name: 'exit-svc', binary: 'exit-bin' }, SimpleService)

      latestMockProcess.emit('exit', 1, null)

      expect(loggers.bootstrap.error).toHaveBeenCalledWith(
        expect.stringContaining('exited'),
        expect.objectContaining({ code: 1 }),
      )
    })

    it('should log error when process has an error', async () => {
      const { loggers } = await import('../../../../../src/kernel/logger')

      manager.register({ name: 'proc-err-svc', binary: 'proc-err-bin' }, SimpleService)

      latestMockProcess.emit('error', new Error('ENOENT'))

      expect(loggers.bootstrap.error).toHaveBeenCalledWith(
        expect.stringContaining('process error'),
        expect.objectContaining({ error: 'ENOENT' }),
      )
    })

    it('should reject pending call when binary responds with error status', async () => {
      manager.register({ name: 'fail-svc', binary: 'fail-bin' }, SimpleService)

      const promise = manager.call('fail-svc', 'getStatus', [])
      await flushMicrotasks()

      emitStdout(
        `${JSON.stringify({
          id: 'test-uuid-1234',
          status: 'error',
          error: 'process crashed',
        })}\n`,
      )

      await expect(promise).rejects.toThrow(/process crashed/)
    })
  })
})
