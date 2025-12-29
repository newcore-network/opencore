/**
 * ParallelCompute Module
 *
 * Provides parallel computation capabilities using worker threads.
 *
 * @example
 * ```typescript
 * import {
 *   initParallelCompute,
 *   defineTask,
 *   filterByDistance,
 * } from '@open-core/framework/server'
 *
 * // Initialize the worker pool (call once at startup)
 * initParallelCompute({ maxWorkers: 4 })
 *
 * // Use built-in tasks
 * const nearby = await filterByDistance.run({
 *   entities: allEntities,
 *   position: player.coords,
 *   radius: 100,
 * })
 *
 * // Define custom tasks
 * const processPlayers = defineTask({
 *   name: 'processPlayers',
 *   estimateCost: (input) => input.length * 10,
 *   workerThreshold: 500,
 *   compute: (players) => players.map(p => ({
 *     ...p,
 *     processed: true,
 *   })),
 * })
 *
 * // Run with automatic mode selection
 * const result = await processPlayers.run(players)
 *
 * // Force sync execution
 * const resultSync = processPlayers.sync(players)
 *
 * // Force parallel execution
 * const resultParallel = await processPlayers.parallel(players)
 * ```
 */

// Service
// Standalone functions
// Built-in tasks
export {
  defineBatchFilter,
  defineBatchReduce,
  defineBatchTransform,
  defineTask,
  filterByDistance,
  findClosest,
  getParallelComputeService,
  initParallelCompute,
  ParallelComputeService,
  shutdownParallelCompute,
  sortByDistance,
  type Vector3Like,
} from './parallel-compute.service'
// Types
export type {
  ExecutionMode,
  ParallelComputeMetrics,
  ParallelTask,
  ParallelTaskOptions,
  TaskResult,
  WorkerInfo,
  WorkerPoolConfig,
  WorkerStatus,
} from './types'

// Worker pool (for advanced usage)
export { WorkerPool } from './worker-pool'
