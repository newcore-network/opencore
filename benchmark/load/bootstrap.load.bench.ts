import { beforeEach, describe, expect, it } from 'vitest'
import { MetadataScanner } from '../../src/kernel/di/metadata.scanner'
import { Command } from '../../src/runtime/server/decorators/command'
import { Controller } from '../../src/runtime/server/decorators/controller'
import { LocalCommandImplementation } from '../../src/runtime/server/implementations/local/command.local'
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
  let commandService: LocalCommandImplementation
  let processor: CommandProcessor

  function collectScanMetrics(name: string, controllers: Array<new (...args: any[]) => object>, iterations = 5) {
    const timings: number[] = []

    for (let i = 0; i < iterations; i++) {
      commandService = new LocalCommandImplementation()
      processor = new CommandProcessor(commandService)
      const scanner = new MetadataScanner([processor])

      const start = performance.now()
      scanner.scan(controllers)
      const end = performance.now()

      timings.push(end - start)
    }

    return calculateLoadMetrics(timings, name, controllers.length, iterations, 0)
  }

  beforeEach(() => {
    resetCitizenFxMocks()

    commandService = new LocalCommandImplementation()
    processor = new CommandProcessor(commandService)
  })

  it('Bootstrap - Scan 1 controller', async () => {
    const metrics = collectScanMetrics('Bootstrap - 1 controller', [TestController1])

    expect(metrics.successCount).toBeGreaterThan(0)
    reportLoadMetric(metrics)
  })

  it('Bootstrap - Scan 3 controllers', async () => {
    const metrics = collectScanMetrics('Bootstrap - 3 controllers', [
      TestController1,
      TestController2,
      TestController3,
    ])

    expect(metrics.successCount).toBeGreaterThan(0)
    reportLoadMetric(metrics)
  })

  it('Bootstrap - Scan 10 controllers (simulated)', async () => {
    const controllers = Array.from({ length: 10 }, () => TestController1)
    const metrics = collectScanMetrics('Bootstrap - 10 controllers', controllers)

    expect(metrics.successCount).toBeGreaterThan(0)
    reportLoadMetric(metrics)
  })

  it('Bootstrap - Scan 50 controllers (simulated)', async () => {
    const controllers = Array.from({ length: 50 }, () => TestController1)
    const metrics = collectScanMetrics('Bootstrap - 50 controllers', controllers)

    expect(metrics.successCount).toBeGreaterThan(0)
    reportLoadMetric(metrics)
  })

  it('Bootstrap - Scan 100 controllers (simulated)', async () => {
    const controllers = Array.from({ length: 100 }, () => TestController1)
    const metrics = collectScanMetrics('Bootstrap - 100 controllers', controllers)

    expect(metrics.successCount).toBeGreaterThan(0)

    reportLoadMetric(metrics)
  })
})
