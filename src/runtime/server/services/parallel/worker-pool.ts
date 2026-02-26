/**
 * Worker Pool
 *
 * Native worker thread pool for CPU-bound computations.
 * Tasks are executed in `node:worker_threads` and communicated through
 * structured-cloned messages.
 */

import * as path from 'node:path'
import { Worker } from 'node:worker_threads'
import {
  WorkerInfo,
  WorkerMessage,
  WorkerPoolConfig,
  WorkerResponse,
} from '../../types/parallel.types'

const DEFAULT_CONFIG: WorkerPoolConfig = {
  minWorkers: 0,
  maxWorkers: 4,
  idleTimeout: 30000,
  taskTimeout: 60000,
}

type EventCallback = (...args: unknown[]) => void

/**
 * Simple event emitter (FiveM compatible)
 */
class SimpleEventEmitter {
  private events: Map<string, EventCallback[]> = new Map()

  on(event: string, callback: EventCallback): void {
    const callbacks = this.events.get(event) || []
    callbacks.push(callback)
    this.events.set(event, callbacks)
  }

  off(event: string, callback: EventCallback): void {
    const callbacks = this.events.get(event) || []
    const index = callbacks.indexOf(callback)
    if (index !== -1) {
      callbacks.splice(index, 1)
    }
  }

  emit(event: string, ...args: unknown[]): void {
    const callbacks = this.events.get(event) || []
    for (const callback of callbacks) {
      try {
        callback(...args)
      } catch {
        // Ignore callback errors
      }
    }
  }
}

interface PendingTask {
  id: string
  message: WorkerMessage
  resolve: (value: unknown) => void
  reject: (error: Error) => void
  startTime: number
  timeoutId: ReturnType<typeof setTimeout> | null
  settled: boolean
}

/**
 * Native worker backed by `node:worker_threads`.
 *
 * Executes one task at a time and returns `WorkerResponse` coming from the
 * worker entrypoint.
 */
class NativeWorker {
  readonly id: number
  private _status: 'idle' | 'busy' | 'terminated' = 'idle'
  private tasksCompleted = 0
  private lastActiveAt = Date.now()
  private currentTask: PendingTask | null = null
  private worker: Worker
  private pendingResponses: Map<
    string,
    { resolve: (response: WorkerResponse) => void; reject: (error: Error) => void }
  > = new Map()

  constructor(
    id: number,
    workerScriptPath: string,
    callbacks: {
      onExit: (workerId: number, code: number | null) => void
      onError: (workerId: number, error: Error) => void
    },
  ) {
    this.id = id

    this.worker = new Worker(workerScriptPath)
    this.worker.on('message', (response: WorkerResponse) => {
      const handlers = this.pendingResponses.get(response.id)
      if (handlers) {
        this.pendingResponses.delete(response.id)
        handlers.resolve(response)
      }
    })

    this.worker.on('error', (error) => {
      this.failAllPending(error instanceof Error ? error : new Error(String(error)))
      this._status = 'terminated'
      this.currentTask = null
      callbacks.onError(this.id, error instanceof Error ? error : new Error(String(error)))
    })

    this.worker.on('exit', (code) => {
      if (this._status !== 'terminated') {
        this.failAllPending(new Error(`Worker exited with code ${code}`))
      }
      this._status = 'terminated'
      this.currentTask = null
      callbacks.onExit(this.id, code)
    })
  }

  get status() {
    return this._status
  }

  get info(): WorkerInfo {
    return {
      id: this.id,
      status: this._status,
      currentTaskId: this.currentTask?.id ?? null,
      tasksCompleted: this.tasksCompleted,
      lastActiveAt: this.lastActiveAt,
    }
  }

  async execute(task: PendingTask): Promise<WorkerResponse> {
    if (this._status === 'terminated') {
      throw new Error('Worker is terminated')
    }

    this._status = 'busy'
    this.currentTask = task

    return new Promise<WorkerResponse>((resolve, reject) => {
      this.pendingResponses.set(task.id, {
        resolve: (response) => {
          this.tasksCompleted++
          this.lastActiveAt = Date.now()
          this._status = 'idle'
          this.currentTask = null
          resolve(response)
        },
        reject: (error) => {
          this._status = 'idle'
          this.currentTask = null
          reject(error)
        },
      })

      this.worker.postMessage(task.message)
    })
  }

  terminate(): void {
    this._status = 'terminated'
    this.currentTask = null
    void this.worker.terminate()
  }

  cancelTask(taskId: string, reason: Error): void {
    const handlers = this.pendingResponses.get(taskId)
    if (handlers) {
      this.pendingResponses.delete(taskId)
      handlers.reject(reason)
    }
  }

  private failAllPending(error: Error): void {
    const handlers = Array.from(this.pendingResponses.values())
    this.pendingResponses.clear()
    for (const h of handlers) {
      try {
        h.reject(error)
      } catch {
        // ignore
      }
    }
  }
}

export class WorkerPool extends SimpleEventEmitter {
  private workers: Map<number, NativeWorker> = new Map()
  private taskQueue: PendingTask[] = []
  private config: WorkerPoolConfig
  private workerIdCounter = 0
  private cleanupInterval: ReturnType<typeof setInterval> | null = null
  private isShuttingDown = false
  private workerScriptPath: string

  constructor(config: Partial<WorkerPoolConfig> = {}) {
    super()
    this.config = { ...DEFAULT_CONFIG, ...config }

    this.workerScriptPath = path.join(__dirname, 'native-worker.entry.js')

    // Start cleanup interval
    this.cleanupInterval = setInterval(() => this.cleanupIdleWorkers(), 10000)

    // Spawn minimum workers
    for (let i = 0; i < this.config.minWorkers; i++) {
      this.spawnWorker()
    }
  }

  /**
   * Check if using native workers
   */
  get isNative(): boolean {
    return true
  }

  /**
   * Execute a task
   */
  async execute(message: WorkerMessage): Promise<unknown> {
    if (this.isShuttingDown) {
      throw new Error('Worker pool is shutting down')
    }

    return new Promise((resolve, reject) => {
      const task: PendingTask = {
        id: message.id,
        message,
        resolve,
        reject,
        startTime: Date.now(),
        timeoutId: null,
        settled: false,
      }

      // Set timeout
      task.timeoutId = setTimeout(() => {
        this.handleTaskTimeout(task)
      }, this.config.taskTimeout)

      // Find an idle worker
      const idleWorker = this.findIdleWorker()

      if (idleWorker) {
        this.assignTask(idleWorker, task)
      } else if (this.workers.size < this.config.maxWorkers) {
        const newWorker = this.spawnWorker()
        if (newWorker) {
          this.assignTask(newWorker, task)
        } else {
          this.taskQueue.push(task)
        }
      } else {
        this.taskQueue.push(task)
      }
    })
  }

  /**
   * Get current pool statistics
   */
  getStats(): {
    totalWorkers: number
    idleWorkers: number
    busyWorkers: number
    queuedTasks: number
    isNative: boolean
  } {
    let idle = 0
    let busy = 0

    for (const worker of this.workers.values()) {
      if (worker.status === 'idle') idle++
      else if (worker.status === 'busy') busy++
    }

    return {
      totalWorkers: this.workers.size,
      idleWorkers: idle,
      busyWorkers: busy,
      queuedTasks: this.taskQueue.length,
      isNative: true,
    }
  }

  /**
   * Get all worker info
   */
  getWorkerInfo(): WorkerInfo[] {
    return Array.from(this.workers.values()).map((w) => w.info)
  }

  /**
   * Shutdown the pool gracefully
   */
  async shutdown(): Promise<void> {
    this.isShuttingDown = true

    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval)
      this.cleanupInterval = null
    }

    // Reject all queued tasks
    for (const task of this.taskQueue) {
      if (task.timeoutId) clearTimeout(task.timeoutId)
      task.reject(new Error('Worker pool shutdown'))
    }
    this.taskQueue = []

    // Terminate all workers
    for (const worker of this.workers.values()) {
      worker.terminate()
    }
    this.workers.clear()
  }

  /**
   * Spawn a new native worker
   */
  private spawnWorker(): NativeWorker | null {
    try {
      const id = this.workerIdCounter++
      const worker = new NativeWorker(id, this.workerScriptPath, {
        onExit: (workerId, code) => {
          const existing = this.workers.get(workerId)
          if (!existing) return
          this.workers.delete(workerId)
          this.emit('workerExit', { workerId, code: code ?? 0 })

          if (!this.isShuttingDown && this.workers.size < this.config.minWorkers) {
            this.spawnWorker()
          }
        },
        onError: (workerId, error) => {
          const existing = this.workers.get(workerId)
          if (!existing) return
          this.workers.delete(workerId)
          this.emit('workerExit', { workerId, code: 1, error: error.message })

          if (!this.isShuttingDown && this.workers.size < this.config.minWorkers) {
            this.spawnWorker()
          }
        },
      })

      this.workers.set(id, worker)
      this.emit('workerSpawned', id)

      return worker
    } catch {
      return null
    }
  }

  /**
   * Find an idle worker
   */
  private findIdleWorker(): NativeWorker | null {
    for (const worker of this.workers.values()) {
      if (worker.status === 'idle') {
        return worker
      }
    }
    return null
  }

  /**
   * Assign a task to a worker
   */
  private async assignTask(worker: NativeWorker, task: PendingTask): Promise<void> {
    try {
      const response = await worker.execute(task)

      if (task.timeoutId) clearTimeout(task.timeoutId)

      if (task.settled) {
        // Task was already rejected (e.g. timeout). Ignore late responses.
        this.processQueue()
        return
      }

      if (response.success) {
        task.settled = true
        task.resolve(response.result)
      } else {
        task.settled = true
        task.reject(new Error(response.error || 'Unknown worker error'))
      }

      this.emit('taskCompleted', {
        taskId: response.id,
        workerId: worker.id,
        executionTime: response.executionTime,
      })

      // Process next queued task
      this.processQueue()
    } catch (error) {
      if (task.timeoutId) clearTimeout(task.timeoutId)

      if (!task.settled) {
        task.settled = true
        task.reject(error instanceof Error ? error : new Error(String(error)))
      }
    }
  }

  /**
   * Handle task timeout
   */
  private handleTaskTimeout(task: PendingTask): void {
    const timeoutError = new Error('Task timeout')

    if (task.timeoutId) {
      clearTimeout(task.timeoutId)
      task.timeoutId = null
    }

    if (!task.settled) {
      task.settled = true
      task.reject(timeoutError)
    }

    // Try to terminate the worker that was executing this task.
    for (const [id, worker] of this.workers) {
      if (worker.info.currentTaskId === task.id) {
        worker.cancelTask(task.id, timeoutError)
        worker.terminate()
        this.workers.delete(id)
        this.emit('workerExit', { workerId: id, code: 1 })

        if (!this.isShuttingDown && this.workers.size < this.config.minWorkers) {
          this.spawnWorker()
        }
        break
      }
    }

    // Remove from queue if present
    const queueIndex = this.taskQueue.findIndex((t) => t.id === task.id)
    if (queueIndex !== -1) {
      this.taskQueue.splice(queueIndex, 1)
    }
  }

  /**
   * Process queued tasks
   */
  private processQueue(): void {
    while (this.taskQueue.length > 0) {
      const idleWorker = this.findIdleWorker()

      if (idleWorker) {
        const task = this.taskQueue.shift()
        if (!task) break
        this.assignTask(idleWorker, task)
      } else if (this.workers.size < this.config.maxWorkers) {
        const newWorker = this.spawnWorker()
        if (newWorker) {
          const task = this.taskQueue.shift()
          if (!task) break
          this.assignTask(newWorker, task)
        } else {
          break
        }
      } else {
        break
      }
    }
  }

  /**
   * Cleanup idle workers
   */
  private cleanupIdleWorkers(): void {
    if (this.isShuttingDown) return

    const now = Date.now()
    const workersToRemove: number[] = []

    for (const [id, worker] of this.workers) {
      if (
        worker.status === 'idle' &&
        now - worker.info.lastActiveAt > this.config.idleTimeout &&
        this.workers.size > this.config.minWorkers
      ) {
        workersToRemove.push(id)
      }
    }

    for (const id of workersToRemove) {
      const worker = this.workers.get(id)
      if (worker) {
        worker.terminate()
        this.workers.delete(id)
        this.emit('workerExit', { workerId: id, code: 0 })
      }
    }
  }
}
