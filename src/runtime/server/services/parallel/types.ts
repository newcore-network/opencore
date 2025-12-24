/**
 * ParallelCompute Module Types
 *
 * Provides type definitions for the parallel computation system.
 */

/**
 * Task execution mode
 */
export type ExecutionMode = 'auto' | 'sync' | 'parallel'

/**
 * Worker pool configuration
 */
export interface WorkerPoolConfig {
  /** Minimum number of workers to keep alive */
  minWorkers: number
  /** Maximum number of workers to spawn */
  maxWorkers: number
  /** Time in ms before idle workers are terminated */
  idleTimeout: number
  /** Maximum time in ms a task can run before timeout */
  taskTimeout: number
}

/**
 * Options for defining a parallel task
 */
export interface ParallelTaskOptions<TInput, TOutput> {
  /** Unique name for the task (used for debugging and metrics) */
  name: string

  /**
   * Function to estimate computational cost based on input.
   * Higher values = more likely to use worker.
   * Return a number representing relative complexity.
   */
  estimateCost?: (input: TInput) => number

  /**
   * If estimated cost exceeds this threshold, automatically use worker.
   * Default: 10000
   */
  workerThreshold?: number

  /**
   * The compute function to execute.
   * MUST be pure (no closures, no external dependencies).
   * Will be serialized and sent to worker.
   */
  compute: (input: TInput) => TOutput

  /**
   * Optional function to split input into chunks for multiple workers.
   * Enables parallel processing across multiple workers.
   */
  chunker?: (input: TInput, workerCount: number) => TInput[]

  /**
   * Optional function to merge results from multiple chunks.
   * Required if chunker is provided.
   */
  merger?: (results: TOutput[]) => TOutput
}

/**
 * A defined parallel task that can be executed
 */
export interface ParallelTask<TInput, TOutput> {
  /** Task name */
  readonly name: string

  /** Task options */
  readonly options: ParallelTaskOptions<TInput, TOutput>

  /**
   * Execute the task with automatic mode selection.
   * Uses worker if estimated cost exceeds threshold.
   */
  run(input: TInput): Promise<TOutput>

  /**
   * Force execution on main thread (synchronous).
   */
  sync(input: TInput): TOutput

  /**
   * Force execution on worker thread.
   */
  parallel(input: TInput): Promise<TOutput>

  /**
   * Execute with multiple workers (requires chunker/merger).
   */
  distributed(input: TInput, workerCount?: number): Promise<TOutput>
}

/**
 * Message sent to worker
 */
export interface WorkerMessage {
  id: string
  taskName: string
  functionBody: string
  input: unknown
}

/**
 * Response from worker
 */
export interface WorkerResponse {
  id: string
  success: boolean
  result?: unknown
  error?: string
  executionTime: number
}

/**
 * Worker status
 */
export type WorkerStatus = 'idle' | 'busy' | 'terminated'

/**
 * Worker info for pool management
 */
export interface WorkerInfo {
  id: number
  status: WorkerStatus
  currentTaskId: string | null
  tasksCompleted: number
  lastActiveAt: number
}

/**
 * Metrics for parallel compute service
 */
export interface ParallelComputeMetrics {
  /** Total tasks executed */
  totalTasks: number
  /** Tasks executed on main thread */
  syncTasks: number
  /** Tasks executed on workers */
  parallelTasks: number
  /** Tasks that failed */
  failedTasks: number
  /** Average execution time in ms */
  avgExecutionTime: number
  /** Total time saved by parallelization (estimated) */
  estimatedTimeSaved: number
  /** Current active workers */
  activeWorkers: number
  /** Peak worker count */
  peakWorkers: number
}

/**
 * Task execution result with timing info
 */
export interface TaskResult<T> {
  result: T
  executionTime: number
  mode: 'sync' | 'parallel' | 'distributed'
  workerCount?: number
}

/**
 * Built-in compute functions for common operations
 */
export interface BuiltInComputes {
  /**
   * Filter entities by distance from a position
   */
  filterByDistance: <T extends { x: number; y: number; z: number }>(input: {
    entities: T[]
    position: { x: number; y: number; z: number }
    radius: number
  }) => T[]

  /**
   * Sort entities by distance from a position
   */
  sortByDistance: <T extends { x: number; y: number; z: number }>(input: {
    entities: T[]
    position: { x: number; y: number; z: number }
  }) => T[]

  /**
   * Batch process items with a transform function
   */
  batchProcess: <T, R>(input: { items: T[]; transform: string }) => R[]
}
