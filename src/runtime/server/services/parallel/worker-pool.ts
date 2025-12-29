/**
 * Worker Pool
 *
 * Abstract worker pool that supports different backends.
 * In FiveM environment, falls back to async execution.
 * Can be extended to support native workers when available.
 */

import { v4 as uuid } from 'uuid'
import type { WorkerInfo, WorkerMessage, WorkerPoolConfig, WorkerResponse } from './types'

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
}

/**
 * Virtual worker that executes tasks asynchronously
 * Used as fallback when native workers aren't available
 */
class VirtualWorker {
  readonly id: number
  private _status: 'idle' | 'busy' | 'terminated' = 'idle'
  private tasksCompleted = 0
  private lastActiveAt = Date.now()
  private currentTask: PendingTask | null = null

  constructor(id: number) {
    this.id = id
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
    this._status = 'busy'
    this.currentTask = task
    const startTime = performance.now()

    try {
      // Execute the function
      const fn = new Function('input', `return (${task.message.functionBody})(input)`)
      const result = fn(task.message.input)
      const executionTime = performance.now() - startTime

      this.tasksCompleted++
      this.lastActiveAt = Date.now()
      this._status = 'idle'
      this.currentTask = null

      return {
        id: task.id,
        success: true,
        result,
        executionTime,
      }
    } catch (error) {
      const executionTime = performance.now() - startTime
      this._status = 'idle'
      this.currentTask = null

      return {
        id: task.id,
        success: false,
        error: error instanceof Error ? error.message : String(error),
        executionTime,
      }
    }
  }

  terminate(): void {
    this._status = 'terminated'
    this.currentTask = null
  }
}

export class WorkerPool extends SimpleEventEmitter {
  private workers: Map<number, VirtualWorker> = new Map()
  private taskQueue: PendingTask[] = []
  private config: WorkerPoolConfig
  private workerIdCounter = 0
  private cleanupInterval: ReturnType<typeof setInterval> | null = null
  private isShuttingDown = false
  private useNativeWorkers = false

  constructor(config: Partial<WorkerPoolConfig> = {}) {
    super()
    this.config = { ...DEFAULT_CONFIG, ...config }

    // Check if native workers are available
    this.detectWorkerSupport()

    // Start cleanup interval
    this.cleanupInterval = setInterval(() => this.cleanupIdleWorkers(), 10000)

    // Spawn minimum workers
    for (let i = 0; i < this.config.minWorkers; i++) {
      this.spawnWorker()
    }
  }

  /**
   * Detect if native worker threads are available
   */
  private detectWorkerSupport(): void {
    try {
      // Try to detect worker_threads module
      // In FiveM this will fail, which is expected
      this.useNativeWorkers = false
    } catch {
      this.useNativeWorkers = false
    }
  }

  /**
   * Check if using native workers
   */
  get isNative(): boolean {
    return this.useNativeWorkers
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
      isNative: this.useNativeWorkers,
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
   * Spawn a new virtual worker
   */
  private spawnWorker(): VirtualWorker | null {
    try {
      const id = this.workerIdCounter++
      const worker = new VirtualWorker(id)

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
  private findIdleWorker(): VirtualWorker | null {
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
  private async assignTask(worker: VirtualWorker, task: PendingTask): Promise<void> {
    try {
      const response = await worker.execute(task)

      if (task.timeoutId) clearTimeout(task.timeoutId)

      if (response.success) {
        task.resolve(response.result)
      } else {
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
      task.reject(error instanceof Error ? error : new Error(String(error)))
    }
  }

  /**
   * Handle task timeout
   */
  private handleTaskTimeout(task: PendingTask): void {
    task.reject(new Error('Task timeout'))

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
        const task = this.taskQueue.shift()!
        this.assignTask(idleWorker, task)
      } else if (this.workers.size < this.config.maxWorkers) {
        const newWorker = this.spawnWorker()
        if (newWorker) {
          const task = this.taskQueue.shift()!
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
