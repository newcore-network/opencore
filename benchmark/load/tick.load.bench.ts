import { describe, it, expect, beforeEach } from 'vitest'
import { container } from 'tsyringe'
import { resetContainer } from '../../tests/helpers/di.helper'
import { resetCitizenFxMocks } from '../../tests/mocks/citizenfx'
import { TickProcessor } from '../../src/server/system/processors/tick.processor'
import { TickSimulator, createTestTickSimulator } from '../utils/tick-simulator'
import { calculateLoadMetrics, reportLoadMetric } from '../utils/metrics'

// Mock de setTick
const registeredTicks: Array<() => void | Promise<void>> = []
let tickExecutionCount = 0

// Mock global setTick
;(global as any).setTick = (handler: () => void | Promise<void>) => {
  registeredTicks.push(handler)
}

describe('Tick Load Benchmarks', () => {
  let tickProcessor: TickProcessor
  let tickSimulator: TickSimulator

  beforeEach(() => {
    resetContainer()
    resetCitizenFxMocks()
    registeredTicks.length = 0
    tickExecutionCount = 0

    // Registrar processors
    container.register('DecoratorProcessor', { useClass: TickProcessor })

    // Resolver servicios
    tickProcessor = container.resolve(TickProcessor)
    tickSimulator = new TickSimulator()
  })

  it('Tick - Single tick handler, light workload', async () => {
    let executionCount = 0
    const handler = () => {
      executionCount++
    }

    tickSimulator.register('test-handler', handler)

    const timings: number[] = []
    const iterations = 1000

    for (let i = 0; i < iterations; i++) {
      const start = performance.now()
      await tickSimulator.executeTick()
      const end = performance.now()
      timings.push(end - start)
    }

    const metrics = calculateLoadMetrics(timings, 'Tick - Single Handler (Light)', 1, iterations, 0)

    expect(executionCount).toBe(iterations)
    reportLoadMetric(metrics)
  })

  it('Tick - Multiple ticks (1, 5, 10, 20, 50)', async () => {
    const tickCounts = [1, 5, 10, 20, 50]

    for (const count of tickCounts) {
      tickSimulator.clear()
      const timings: number[] = []

      // Registrar N handlers
      for (let i = 0; i < count; i++) {
        tickSimulator.register(`handler-${i}`, () => {
          // Light workload
          const sum = 1 + 1
        })
      }

      const iterations = 100

      for (let i = 0; i < iterations; i++) {
        const start = performance.now()
        await tickSimulator.executeTick()
        const end = performance.now()
        timings.push(end - start)
      }

      const metrics = calculateLoadMetrics(
        timings,
        `Tick - ${count} Handlers (Light)`,
        count,
        iterations,
        0,
      )

      reportLoadMetric(metrics)
    }
  })

  it('Tick - Different workloads (light, medium, heavy)', async () => {
    const workloads: Array<'light' | 'medium' | 'heavy'> = ['light', 'medium', 'heavy']

    for (const workload of workloads) {
      tickSimulator.clear()
      const timings: number[] = []

      const simulator = createTestTickSimulator(5, workload)

      const iterations = 100

      for (let i = 0; i < iterations; i++) {
        const start = performance.now()
        await simulator.executeTick()
        const end = performance.now()
        timings.push(end - start)
      }

      const metrics = calculateLoadMetrics(
        timings,
        `Tick - 5 Handlers (${workload} workload)`,
        5,
        iterations,
        0,
      )

      reportLoadMetric(metrics)
    }
  })

  it('Tick - Concurrent tick execution', async () => {
    tickSimulator.clear()
    const timings: number[] = []

    // Registrar 10 handlers
    for (let i = 0; i < 10; i++) {
      tickSimulator.register(`handler-${i}`, () => {
        // Medium workload
        const arr = Array.from({ length: 100 }, (_, i) => i)
        arr.reduce((acc, val) => acc + val, 0)
      })
    }

    const concurrentExecutions = 50

    const promises = Array.from({ length: concurrentExecutions }, async () => {
      const start = performance.now()
      await tickSimulator.executeTick()
      const end = performance.now()
      timings.push(end - start)
    })

    await Promise.all(promises)

    const metrics = calculateLoadMetrics(
      timings,
      'Tick - Concurrent Execution (10 handlers, 50 concurrent)',
      10,
      concurrentExecutions,
      0,
    )

    reportLoadMetric(metrics)
  })

  it('Tick - Sequential vs parallel execution', async () => {
    tickSimulator.clear()

    // Registrar 20 handlers
    for (let i = 0; i < 20; i++) {
      tickSimulator.register(`handler-${i}`, () => {
        const arr = Array.from({ length: 50 }, (_, i) => i)
        arr.map((val) => val * 2)
      })
    }

    const iterations = 100

    // Secuencial
    const sequentialTimings: number[] = []
    const sequentialStart = performance.now()
    for (let i = 0; i < iterations; i++) {
      const start = performance.now()
      await tickSimulator.executeTick()
      const end = performance.now()
      sequentialTimings.push(end - start)
    }
    const sequentialEnd = performance.now()
    const sequentialTotal = sequentialEnd - sequentialStart

    tickSimulator.resetMetrics()

    // Paralelo
    const parallelTimings: number[] = []
    const parallelStart = performance.now()
    const promises = Array.from({ length: iterations }, async () => {
      const start = performance.now()
      await tickSimulator.executeTick()
      const end = performance.now()
      parallelTimings.push(end - start)
    })
    await Promise.all(promises)
    const parallelEnd = performance.now()
    const parallelTotal = parallelEnd - parallelStart

    const sequentialMetrics = calculateLoadMetrics(
      sequentialTimings,
      'Tick - Sequential Execution',
      20,
      iterations,
      0,
    )

    const parallelMetrics = calculateLoadMetrics(parallelTimings, 'Tick - Parallel Execution', 20, iterations, 0)

    reportLoadMetric(sequentialMetrics)
    console.log(`  → Sequential total: ${sequentialTotal.toFixed(2)}ms`)
    reportLoadMetric(parallelMetrics)
    console.log(`  → Parallel total: ${parallelTotal.toFixed(2)}ms`)
    console.log(`  └─ Speedup: ${(sequentialTotal / parallelTotal).toFixed(2)}x`)
  })

  it('Tick - Real setTick simulation with multiple handlers', async () => {
    const handlerCounts = [1, 5, 10, 20, 50]

    for (const count of handlerCounts) {
      registeredTicks.length = 0

      // Registrar handlers usando el processor (simulado)
      for (let i = 0; i < count; i++) {
        const controller = {
          [`tickHandler${i}`]: async () => {
            // Light workload
            const sum = 1 + 1
          },
        }
        // Simular registro
        ;(global as any).setTick(controller[`tickHandler${i}`])
      }

      const timings: number[] = []
      const iterations = 100

      for (let i = 0; i < iterations; i++) {
        const start = performance.now()
        // Ejecutar todos los ticks registrados
        for (const tickHandler of registeredTicks) {
          await tickHandler()
        }
        const end = performance.now()
        timings.push(end - start)
      }

      const metrics = calculateLoadMetrics(
        timings,
        `Tick - Real setTick (${count} handlers)`,
        count,
        iterations,
        0,
      )

      reportLoadMetric(metrics)
    }
  })
})

