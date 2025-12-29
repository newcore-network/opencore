/**
 * ParallelCompute Service
 *
 * Provides an ergonomic API for parallel computation.
 * Uses virtual workers in FiveM environment, with async execution
 * that yields to the event loop for better performance.
 *
 * Automatically decides whether to run synchronously or asynchronously
 * based on estimated computational cost.
 */

import { injectable } from 'tsyringe'
import { v4 as uuid } from 'uuid'
import type {
  ParallelComputeMetrics,
  ParallelTask,
  ParallelTaskOptions,
  TaskResult,
  WorkerMessage,
  WorkerPoolConfig,
} from './types'
import { WorkerPool } from './worker-pool'

const DEFAULT_WORKER_THRESHOLD = 10000

/**
 * Service for managing parallel computation
 */
@injectable()
export class ParallelComputeService {
  private pool: WorkerPool | null = null
  private metrics: ParallelComputeMetrics = {
    totalTasks: 0,
    syncTasks: 0,
    parallelTasks: 0,
    failedTasks: 0,
    avgExecutionTime: 0,
    estimatedTimeSaved: 0,
    activeWorkers: 0,
    peakWorkers: 0,
  }
  private totalExecutionTime = 0
  private isInitialized = false
  private poolConfig: Partial<WorkerPoolConfig> = {}

  /**
   * Initialize the worker pool
   * Must be called before using parallel execution
   */
  initialize(config: Partial<WorkerPoolConfig> = {}): void {
    if (this.isInitialized) return

    this.poolConfig = config
    this.pool = new WorkerPool(config)

    this.pool.on('taskCompleted', (data: unknown) => {
      const { executionTime } = data as { executionTime: number }
      this.updateMetrics(executionTime, 'parallel')
    })

    this.pool.on('workerSpawned', () => {
      const stats = this.pool?.getStats()
      if (stats) {
        this.metrics.activeWorkers = stats.totalWorkers
        this.metrics.peakWorkers = Math.max(this.metrics.peakWorkers, stats.totalWorkers)
      }
    })

    this.pool.on('workerExit', () => {
      const stats = this.pool?.getStats()
      if (stats) {
        this.metrics.activeWorkers = stats.totalWorkers
      }
    })

    this.isInitialized = true
  }

  /**
   * Check if initialized
   */
  get initialized(): boolean {
    return this.isInitialized
  }

  /**
   * Check if using native workers
   */
  get isNative(): boolean {
    return this.pool?.isNative ?? false
  }

  /**
   * Shutdown the service and worker pool
   */
  async shutdown(): Promise<void> {
    if (this.pool) {
      await this.pool.shutdown()
      this.pool = null
    }
    this.isInitialized = false
  }

  /**
   * Get current metrics
   */
  getMetrics(): ParallelComputeMetrics {
    return { ...this.metrics }
  }

  /**
   * Get worker pool statistics
   */
  getPoolStats() {
    return this.pool?.getStats() ?? null
  }

  /**
   * Reset metrics
   */
  resetMetrics(): void {
    this.metrics = {
      totalTasks: 0,
      syncTasks: 0,
      parallelTasks: 0,
      failedTasks: 0,
      avgExecutionTime: 0,
      estimatedTimeSaved: 0,
      activeWorkers: this.pool?.getStats().totalWorkers ?? 0,
      peakWorkers: 0,
    }
    this.totalExecutionTime = 0
  }

  /**
   * Execute a compute function with automatic mode selection
   */
  async run<TInput, TOutput>(
    options: ParallelTaskOptions<TInput, TOutput>,
    input: TInput,
  ): Promise<TaskResult<TOutput>> {
    const cost = options.estimateCost?.(input) ?? 0
    const threshold = options.workerThreshold ?? DEFAULT_WORKER_THRESHOLD

    if (cost > threshold && this.pool) {
      return this.parallel(options, input)
    }

    return this.sync(options, input)
  }

  /**
   * Execute synchronously on main thread
   */
  sync<TInput, TOutput>(
    options: ParallelTaskOptions<TInput, TOutput>,
    input: TInput,
  ): TaskResult<TOutput> {
    const startTime = performance.now()

    try {
      const result = options.compute(input)
      const executionTime = performance.now() - startTime

      this.updateMetrics(executionTime, 'sync')

      return {
        result,
        executionTime,
        mode: 'sync',
      }
    } catch (error) {
      this.metrics.failedTasks++
      throw error
    }
  }

  /**
   * Execute on worker (async with yielding in FiveM)
   */
  async parallel<TInput, TOutput>(
    options: ParallelTaskOptions<TInput, TOutput>,
    input: TInput,
  ): Promise<TaskResult<TOutput>> {
    if (!this.pool) {
      // Fallback to sync if pool not initialized
      return this.sync(options, input)
    }

    const startTime = performance.now()

    try {
      const message: WorkerMessage = {
        id: uuid(),
        taskName: options.name,
        functionBody: options.compute.toString(),
        input,
      }

      const result = (await this.pool.execute(message)) as TOutput
      const executionTime = performance.now() - startTime

      return {
        result,
        executionTime,
        mode: 'parallel',
      }
    } catch (error) {
      this.metrics.failedTasks++
      throw error
    }
  }

  /**
   * Execute distributed across multiple workers
   */
  async distributed<TInput, TOutput>(
    options: ParallelTaskOptions<TInput, TOutput>,
    input: TInput,
    workerCount?: number,
  ): Promise<TaskResult<TOutput>> {
    if (!options.chunker || !options.merger) {
      throw new Error('Distributed execution requires chunker and merger functions')
    }

    if (!this.pool) {
      // Fallback to sync if pool not initialized
      return this.sync(options, input)
    }

    const startTime = performance.now()
    const actualWorkerCount = workerCount ?? this.poolConfig.maxWorkers ?? 4

    try {
      const chunks = options.chunker(input, actualWorkerCount)

      const results = await Promise.all(
        chunks.map(async (chunk) => {
          const message: WorkerMessage = {
            id: uuid(),
            taskName: options.name,
            functionBody: options.compute.toString(),
            input: chunk,
          }
          return this.pool?.execute(message) as Promise<TOutput>
        }),
      )

      const mergedResult = options.merger(results)
      const executionTime = performance.now() - startTime

      this.updateMetrics(executionTime, 'distributed')

      return {
        result: mergedResult,
        executionTime,
        mode: 'distributed',
        workerCount: chunks.length,
      }
    } catch (error) {
      this.metrics.failedTasks++
      throw error
    }
  }

  /**
   * Update internal metrics
   */
  private updateMetrics(executionTime: number, mode: 'sync' | 'parallel' | 'distributed'): void {
    this.metrics.totalTasks++
    this.totalExecutionTime += executionTime
    this.metrics.avgExecutionTime = this.totalExecutionTime / this.metrics.totalTasks

    if (mode === 'sync') {
      this.metrics.syncTasks++
    } else {
      this.metrics.parallelTasks++
    }
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Standalone Functions (no DI required)
// ─────────────────────────────────────────────────────────────────────────────

let globalService: ParallelComputeService | null = null

/**
 * Get or create the global ParallelCompute service instance
 */
export function getParallelComputeService(): ParallelComputeService {
  if (!globalService) {
    globalService = new ParallelComputeService()
  }
  return globalService
}

/**
 * Initialize the global ParallelCompute service
 */
export function initParallelCompute(config: Partial<WorkerPoolConfig> = {}): void {
  const service = getParallelComputeService()
  service.initialize(config)
}

/**
 * Shutdown the global ParallelCompute service
 */
export async function shutdownParallelCompute(): Promise<void> {
  if (globalService) {
    await globalService.shutdown()
    globalService = null
  }
}

/**
 * Define a parallel task with the given options
 * Returns a task object with run, sync, parallel, and distributed methods
 */
export function defineTask<TInput, TOutput>(
  options: ParallelTaskOptions<TInput, TOutput>,
): ParallelTask<TInput, TOutput> {
  const service = getParallelComputeService()

  return {
    name: options.name,
    options,

    async run(input: TInput): Promise<TOutput> {
      const result = await service.run(options, input)
      return result.result
    },

    sync(input: TInput): TOutput {
      const result = service.sync(options, input)
      return result.result
    },

    async parallel(input: TInput): Promise<TOutput> {
      const result = await service.parallel(options, input)
      return result.result
    },

    async distributed(input: TInput, workerCount?: number): Promise<TOutput> {
      const result = await service.distributed(options, input, workerCount)
      return result.result
    },
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Built-in Tasks
// ─────────────────────────────────────────────────────────────────────────────

export interface Vector3Like {
  x: number
  y: number
  z: number
}

/**
 * Built-in task: Filter entities by distance from a position
 */
export const filterByDistance = defineTask<
  { entities: Vector3Like[]; position: Vector3Like; radius: number },
  Vector3Like[]
>({
  name: 'filterByDistance',
  estimateCost: (input) => input.entities.length,
  workerThreshold: 1000,
  compute: (input) => {
    const { entities, position, radius } = input
    const radiusSquared = radius * radius

    return entities.filter((entity) => {
      const dx = entity.x - position.x
      const dy = entity.y - position.y
      const dz = entity.z - position.z
      return dx * dx + dy * dy + dz * dz <= radiusSquared
    })
  },
  chunker: (input, workerCount) => {
    const { entities, position, radius } = input
    const chunkSize = Math.ceil(entities.length / workerCount)
    const chunks: (typeof input)[] = []

    for (let i = 0; i < entities.length; i += chunkSize) {
      chunks.push({
        entities: entities.slice(i, i + chunkSize),
        position,
        radius,
      })
    }

    return chunks
  },
  merger: (results) => ([] as Vector3Like[]).concat(...results),
})

/**
 * Built-in task: Sort entities by distance from a position
 */
export const sortByDistance = defineTask<
  { entities: Vector3Like[]; position: Vector3Like },
  Vector3Like[]
>({
  name: 'sortByDistance',
  estimateCost: (input) => input.entities.length * Math.log(input.entities.length),
  workerThreshold: 500,
  compute: (input) => {
    const { entities, position } = input

    return [...entities].sort((a, b) => {
      const dxA = a.x - position.x
      const dyA = a.y - position.y
      const dzA = a.z - position.z
      const distA = dxA * dxA + dyA * dyA + dzA * dzA

      const dxB = b.x - position.x
      const dyB = b.y - position.y
      const dzB = b.z - position.z
      const distB = dxB * dxB + dyB * dyB + dzB * dzB

      return distA - distB
    })
  },
})

/**
 * Built-in task: Find closest entity to a position
 */
export const findClosest = defineTask<
  { entities: Vector3Like[]; position: Vector3Like },
  Vector3Like | null
>({
  name: 'findClosest',
  estimateCost: (input) => input.entities.length,
  workerThreshold: 5000,
  compute: (input) => {
    const { entities, position } = input

    if (entities.length === 0) return null

    let closest = entities[0]
    let minDistSquared = Infinity

    for (const entity of entities) {
      const dx = entity.x - position.x
      const dy = entity.y - position.y
      const dz = entity.z - position.z
      const distSquared = dx * dx + dy * dy + dz * dz

      if (distSquared < minDistSquared) {
        minDistSquared = distSquared
        closest = entity
      }
    }

    return closest
  },
})

/**
 * Built-in task: Batch transform items
 */
export function defineBatchTransform<T, R>(
  name: string,
  transform: (item: T) => R,
  threshold = 1000,
) {
  return defineTask<T[], R[]>({
    name,
    estimateCost: (input) => input.length,
    workerThreshold: threshold,
    compute: (input) => input.map(transform),
    chunker: (input, workerCount) => {
      const chunkSize = Math.ceil(input.length / workerCount)
      const chunks: T[][] = []

      for (let i = 0; i < input.length; i += chunkSize) {
        chunks.push(input.slice(i, i + chunkSize))
      }

      return chunks
    },
    merger: (results) => ([] as R[]).concat(...results),
  })
}

/**
 * Built-in task: Batch filter items
 */
export function defineBatchFilter<T>(
  name: string,
  predicate: (item: T) => boolean,
  threshold = 1000,
) {
  return defineTask<T[], T[]>({
    name,
    estimateCost: (input) => input.length,
    workerThreshold: threshold,
    compute: (input) => input.filter(predicate),
    chunker: (input, workerCount) => {
      const chunkSize = Math.ceil(input.length / workerCount)
      const chunks: T[][] = []

      for (let i = 0; i < input.length; i += chunkSize) {
        chunks.push(input.slice(i, i + chunkSize))
      }

      return chunks
    },
    merger: (results) => ([] as T[]).concat(...results),
  })
}

/**
 * Built-in task: Batch reduce items
 */
export function defineBatchReduce<T, R>(
  name: string,
  reducer: (acc: R, item: T) => R,
  initial: R,
  merger: (results: R[]) => R,
  threshold = 1000,
) {
  return defineTask<T[], R>({
    name,
    estimateCost: (input) => input.length,
    workerThreshold: threshold,
    compute: (input) => input.reduce(reducer, initial),
    chunker: (input, workerCount) => {
      const chunkSize = Math.ceil(input.length / workerCount)
      const chunks: T[][] = []

      for (let i = 0; i < input.length; i += chunkSize) {
        chunks.push(input.slice(i, i + chunkSize))
      }

      return chunks
    },
    merger,
  })
}
