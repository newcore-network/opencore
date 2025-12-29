import { beforeEach, describe, expect, it } from 'vitest'
import { MetadataScanner } from '../../src/kernel/di/metadata.scanner'
import { Command } from '../../src/runtime/server/decorators/command'
import { Controller } from '../../src/runtime/server/decorators/controller'
import { CommandService } from '../../src/runtime/server/services/command.service'
import { DefaultSecurityHandler } from '../../src/runtime/server/services/default/default-security.handler'
import { CommandProcessor } from '../../src/runtime/server/system/processors/command.processor'
import { resetCitizenFxMocks } from '../../tests/mocks/citizenfx'
import { calculateLoadMetrics, reportLoadMetric } from '../utils/metrics'

// @ts-expect-error - experimentalDecorators compatibility
@Controller()
class TestController1 {
  // @ts-expect-error - experimentalDecorators compatibility
  @Command('test1')
  async method1() {}
}

// @ts-expect-error - experimentalDecorators compatibility
@Controller()
class TestController2 {
  // @ts-expect-error - experimentalDecorators compatibility
  @Command('test2')
  async method1() {}

  // @ts-expect-error - experimentalDecorators compatibility
  @Command('test3')
  async method2() {}
}

// @ts-expect-error - experimentalDecorators compatibility
@Controller()
class TestController3 {
  // @ts-expect-error - experimentalDecorators compatibility
  @Command('test4')
  async method1() {}

  // @ts-expect-error - experimentalDecorators compatibility
  @Command('test5')
  async method2() {}

  // @ts-expect-error - experimentalDecorators compatibility
  @Command('test6')
  async method3() {}
}

describe('Bootstrap Load Benchmarks', () => {
  let commandService: CommandService
  let processor: CommandProcessor

  beforeEach(() => {
    resetCitizenFxMocks()

    commandService = new CommandService()
    processor = new CommandProcessor(commandService)
  })

  it('Bootstrap - Scan 1 controller', async () => {
    const scanner = new MetadataScanner([processor])

    const start = performance.now()
    scanner.scan([TestController1])
    const end = performance.now()

    const timing = end - start
    expect(timing).toBeLessThan(100)

    console.log(`[LOAD] Bootstrap - 1 controller: ${timing.toFixed(2)}ms`)
  })

  it('Bootstrap - Scan 3 controllers', async () => {
    const scanner = new MetadataScanner([processor])

    const start = performance.now()
    scanner.scan([TestController1, TestController2, TestController3])
    const end = performance.now()

    const timing = end - start
    expect(timing).toBeLessThan(200)

    console.log(`[LOAD] Bootstrap - 3 controllers: ${timing.toFixed(2)}ms`)
  })

  it('Bootstrap - Scan 10 controllers (simulated)', async () => {
    const scanner = new MetadataScanner([processor])

    const controllers = Array.from({ length: 10 }, () => TestController1)

    const start = performance.now()
    scanner.scan(controllers)
    const end = performance.now()

    const timing = end - start
    expect(timing).toBeLessThan(500)

    console.log(`[LOAD] Bootstrap - 10 controllers: ${timing.toFixed(2)}ms`)
  })

  it('Bootstrap - Scan 50 controllers (simulated)', async () => {
    const scanner = new MetadataScanner([processor])

    const controllers = Array.from({ length: 50 }, () => TestController1)

    const start = performance.now()
    scanner.scan(controllers)
    const end = performance.now()

    const timing = end - start
    expect(timing).toBeLessThan(2000)

    console.log(`[LOAD] Bootstrap - 50 controllers: ${timing.toFixed(2)}ms`)
  })

  it('Bootstrap - Scan 100 controllers (simulated)', async () => {
    const scanner = new MetadataScanner([processor])

    const controllers = Array.from({ length: 100 }, () => TestController1)

    const timings: number[] = []
    const iterations = 5

    for (let i = 0; i < iterations; i++) {
      const start = performance.now()
      scanner.scan(controllers)
      const end = performance.now()
      timings.push(end - start)
    }

    const metrics = calculateLoadMetrics(timings, 'Bootstrap - 100 controllers', 100, iterations, 0)

    expect(metrics.mean).toBeLessThan(5000)

    reportLoadMetric(metrics)
  })
})
