import 'reflect-metadata'
import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  ParallelCompute,
  defineBatchFilter,
  defineBatchReduce,
  defineBatchTransform,
  defineTask,
  getParallelComputeService,
  shutdownParallelCompute,
} from '../../../../src/runtime/server/apis/parallel-compute.api'

describe('ParallelCompute', () => {
  afterEach(async () => {
    await shutdownParallelCompute()
  })

  it('runs synchronously below the worker threshold', async () => {
    const service = new ParallelCompute()

    const result = await service.run(
      {
        name: 'sum-sync',
        estimateCost: (input: number[]) => input.length,
        workerThreshold: 10,
        compute: (input: number[]) => input.reduce((sum, value) => sum + value, 0),
      },
      [1, 2, 3],
    )

    expect(result.result).toBe(6)
    expect(result.mode).toBe('sync')
    expect(service.getMetrics()).toMatchObject({
      totalTasks: 1,
      syncTasks: 1,
      parallelTasks: 0,
      failedTasks: 0,
    })
  })

  it('runs in parallel when a worker pool is available', async () => {
    const service = new ParallelCompute()
    const execute = vi.fn(async (message: { input: number[] }) => {
      ;(service as any).updateMetrics(4, 'parallel')
      return message.input.reduce((sum, value) => sum + value, 0)
    })

    ;(service as any).pool = {
      execute,
      isNative: true,
      getStats: () => ({ totalWorkers: 2 }),
      shutdown: vi.fn(async () => undefined),
    }
    ;(service as any).isInitialized = true

    const result = await service.run(
      {
        name: 'sum-parallel',
        estimateCost: (input: number[]) => input.length,
        workerThreshold: 2,
        compute: (input: number[]) => input.reduce((sum, value) => sum + value, 0),
      },
      [1, 2, 3, 4],
    )

    expect(result.result).toBe(10)
    expect(result.mode).toBe('parallel')
    expect(execute).toHaveBeenCalledTimes(1)
  })

  it('supports distributed execution with chunking and merging', async () => {
    const service = new ParallelCompute()
    const execute = vi.fn(async (message: { input: number[] }) => message.input.map((value) => value * 2))

    ;(service as any).pool = {
      execute,
      isNative: true,
      getStats: () => ({ totalWorkers: 2 }),
      shutdown: vi.fn(async () => undefined),
    }
    ;(service as any).isInitialized = true

    const result = await service.distributed(
      {
        name: 'distributed-double',
        compute: (input: number[]) => input.map((value) => value * 2),
        chunker: (input: number[], workerCount: number) => {
          const chunkSize = Math.ceil(input.length / workerCount)
          const chunks: number[][] = []
          for (let index = 0; index < input.length; index += chunkSize) {
            chunks.push(input.slice(index, index + chunkSize))
          }
          return chunks
        },
        merger: (results: number[][]) => results.flat(),
      },
      [1, 2, 3, 4],
      2,
    )

    expect(result.result).toEqual([2, 4, 6, 8])
    expect(result.mode).toBe('distributed')
    expect(result.workerCount).toBe(2)
    expect(execute).toHaveBeenCalledTimes(2)
    expect(service.getMetrics().parallelTasks).toBe(1)
  })

  it('falls back to sync execution when the pool is unavailable', async () => {
    const service = new ParallelCompute()

    const result = await service.parallel(
      {
        name: 'fallback',
        compute: (input: number) => input * 3,
      },
      7,
    )

    expect(result).toMatchObject({ result: 21, mode: 'sync' })
  })

  it('tracks failed tasks and can reset metrics', () => {
    const service = new ParallelCompute()

    expect(() =>
      service.sync(
        {
          name: 'boom',
          compute: () => {
            throw new Error('boom')
          },
        },
        undefined,
      ),
    ).toThrow('boom')

    expect(service.getMetrics().failedTasks).toBe(1)
    service.resetMetrics()
    expect(service.getMetrics()).toMatchObject({
      totalTasks: 0,
      syncTasks: 0,
      parallelTasks: 0,
      failedTasks: 0,
    })
  })

  it('exposes the global task helpers', async () => {
    const globalService = getParallelComputeService()

    const batchTransform = defineBatchTransform('square', (value: number) => value * value)
    const batchFilter = defineBatchFilter('even', (value: number) => value % 2 === 0)
    const batchReduce = defineBatchReduce(
      'sum',
      (sum: number, value: number) => sum + value,
      0,
      (results: number[]) => results.reduce((sum, value) => sum + value, 0),
    )
    const task = defineTask({
      name: 'identity',
      compute: (value: number) => value,
      estimateCost: () => 0,
    })

    expect(batchTransform.sync([2, 3])).toEqual([4, 9])
    expect(batchFilter.sync([1, 2, 3, 4])).toEqual([2, 4])
    expect(batchReduce.sync([1, 2, 3])).toBe(6)
    await expect(task.run(9)).resolves.toBe(9)
    expect(globalService.initialized).toBe(false)
  })
})
