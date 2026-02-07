import 'reflect-metadata'
import { Bench } from 'tinybench'
import {
  defineTask,
  filterByDistance,
  findClosest,
  initParallelCompute,
  shutdownParallelCompute,
  sortByDistance,
} from '../../src/runtime/server/apis/parallel-compute.api'
import { Vector3 } from '../../src'

// Generate test entities
function generateEntities(count: number): Vector3[] {
  return Array.from({ length: count }, () => ({
    x: Math.random() * 1000,
    y: Math.random() * 1000,
    z: Math.random() * 100,
  }))
}

const testPosition: Vector3 = { x: 500, y: 500, z: 50 }

// Custom compute task for benchmarking
const heavyCompute = defineTask<number[], number>({
  name: 'heavyCompute',
  estimateCost: (input) => input.length * 10,
  workerThreshold: 100,
  compute: (input) => {
    let sum = 0
    for (const num of input) {
      // Simulate heavier computation
      sum += Math.sqrt(num) * Math.sin(num) * Math.cos(num)
    }
    return sum
  },
})

export async function runParallelComputeBenchmark(): Promise<Bench> {
  const bench = new Bench({ time: 1000 })

  // Initialize the parallel compute service
  initParallelCompute({ maxWorkers: 4 })

  // Pre-generate test data
  const entities100 = generateEntities(100)
  const entities500 = generateEntities(500)
  const entities1000 = generateEntities(1000)
  const entities5000 = generateEntities(5000)

  const numbers100 = Array.from({ length: 100 }, (_, i) => i)
  const numbers1000 = Array.from({ length: 1000 }, (_, i) => i)
  const numbers10000 = Array.from({ length: 10000 }, (_, i) => i)

  // ─────────────────────────────────────────────────────────────────────────────
  // filterByDistance benchmarks
  // ─────────────────────────────────────────────────────────────────────────────

  bench.add('ParallelCompute - filterByDistance (100 entities, sync)', () => {
    filterByDistance.sync({
      entities: entities100,
      position: testPosition,
      radius: 100,
    })
  })

  bench.add('ParallelCompute - filterByDistance (500 entities, sync)', () => {
    filterByDistance.sync({
      entities: entities500,
      position: testPosition,
      radius: 100,
    })
  })

  bench.add('ParallelCompute - filterByDistance (1000 entities, sync)', () => {
    filterByDistance.sync({
      entities: entities1000,
      position: testPosition,
      radius: 100,
    })
  })

  bench.add('ParallelCompute - filterByDistance (1000 entities, auto)', async () => {
    await filterByDistance.run({
      entities: entities1000,
      position: testPosition,
      radius: 100,
    })
  })

  bench.add('ParallelCompute - filterByDistance (5000 entities, sync)', () => {
    filterByDistance.sync({
      entities: entities5000,
      position: testPosition,
      radius: 100,
    })
  })

  bench.add('ParallelCompute - filterByDistance (5000 entities, parallel)', async () => {
    await filterByDistance.parallel({
      entities: entities5000,
      position: testPosition,
      radius: 100,
    })
  })

  // ─────────────────────────────────────────────────────────────────────────────
  // sortByDistance benchmarks
  // ─────────────────────────────────────────────────────────────────────────────

  bench.add('ParallelCompute - sortByDistance (100 entities, sync)', () => {
    sortByDistance.sync({
      entities: entities100,
      position: testPosition,
    })
  })

  bench.add('ParallelCompute - sortByDistance (500 entities, sync)', () => {
    sortByDistance.sync({
      entities: entities500,
      position: testPosition,
    })
  })

  bench.add('ParallelCompute - sortByDistance (1000 entities, sync)', () => {
    sortByDistance.sync({
      entities: entities1000,
      position: testPosition,
    })
  })

  // ─────────────────────────────────────────────────────────────────────────────
  // findClosest benchmarks
  // ─────────────────────────────────────────────────────────────────────────────

  bench.add('ParallelCompute - findClosest (1000 entities, sync)', () => {
    findClosest.sync({
      entities: entities1000,
      position: testPosition,
    })
  })

  bench.add('ParallelCompute - findClosest (5000 entities, sync)', () => {
    findClosest.sync({
      entities: entities5000,
      position: testPosition,
    })
  })

  bench.add('ParallelCompute - findClosest (5000 entities, parallel)', async () => {
    await findClosest.parallel({
      entities: entities5000,
      position: testPosition,
    })
  })

  // ─────────────────────────────────────────────────────────────────────────────
  // Custom heavy compute benchmarks
  // ─────────────────────────────────────────────────────────────────────────────

  bench.add('ParallelCompute - heavyCompute (100 items, sync)', () => {
    heavyCompute.sync(numbers100)
  })

  bench.add('ParallelCompute - heavyCompute (100 items, auto)', async () => {
    await heavyCompute.run(numbers100)
  })

  bench.add('ParallelCompute - heavyCompute (1000 items, sync)', () => {
    heavyCompute.sync(numbers1000)
  })

  bench.add('ParallelCompute - heavyCompute (1000 items, parallel)', async () => {
    await heavyCompute.parallel(numbers1000)
  })

  bench.add('ParallelCompute - heavyCompute (10000 items, sync)', () => {
    heavyCompute.sync(numbers10000)
  })

  bench.add('ParallelCompute - heavyCompute (10000 items, parallel)', async () => {
    await heavyCompute.parallel(numbers10000)
  })

  // ─────────────────────────────────────────────────────────────────────────────
  // Overhead measurement
  // ─────────────────────────────────────────────────────────────────────────────

  const minimalTask = defineTask<number, number>({
    name: 'minimal',
    compute: (input) => input + 1,
  })

  bench.add('ParallelCompute - overhead (sync, minimal task)', () => {
    minimalTask.sync(42)
  })

  bench.add('ParallelCompute - overhead (parallel, minimal task)', async () => {
    await minimalTask.parallel(42)
  })

  // Add cleanup after all benchmarks
  bench.addEventListener('complete', async () => {
    await shutdownParallelCompute()
  })

  return bench
}
