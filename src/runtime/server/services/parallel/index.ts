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
