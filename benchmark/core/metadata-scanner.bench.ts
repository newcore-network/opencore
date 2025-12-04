import { Bench } from 'tinybench'
import { container } from 'tsyringe'
import { MetadataScanner } from '../../src/system/metadata.scanner'
import { DecoratorProcessor } from '../../src/system/decorator-processor'
import { METADATA_KEYS } from '../../src/server/system/metadata-server.keys'
import { Command } from '../../src/server/decorators/command'
import { Controller } from '../../src/server/decorators/controller'
import { resetContainer } from '../../tests/helpers/di.helper'

class MockProcessor implements DecoratorProcessor {
  readonly metadataKey = METADATA_KEYS.COMMAND
  processCount = 0

  process(_target: any, _methodName: string, _metadata: any): void {
    this.processCount++
  }
}

// @ts-ignore - experimentalDecorators compatibility
@Controller()
class TestController1 {
  // @ts-ignore - experimentalDecorators compatibility
  @Command('test1')
  method1() {}

  // @ts-ignore - experimentalDecorators compatibility
  @Command('test2')
  method2() {}

  // @ts-ignore - experimentalDecorators compatibility
  @Command('test3')
  method3() {}
}

// @ts-ignore - experimentalDecorators compatibility
@Controller()
class TestController2 {
  // @ts-ignore - experimentalDecorators compatibility
  @Command('test4')
  method1() {}

  // @ts-ignore - experimentalDecorators compatibility
  @Command('test5')
  method2() {}
}

// @ts-ignore - experimentalDecorators compatibility
@Controller()
class TestController3 {
  // @ts-ignore - experimentalDecorators compatibility
  @Command('test6')
  method1() {}
}

export async function runMetadataScannerBenchmark(): Promise<Bench> {
  const bench = new Bench({ time: 1000 })

  // Limpiar antes de cada benchmark
  bench.add('MetadataScanner - 1 controller, 3 methods', async () => {
    resetContainer()
    const processor = new MockProcessor()
    container.registerInstance('DecoratorProcessor', processor)
    const scanner = new MetadataScanner([processor])
    scanner.scan([TestController1])
  })

  bench.add('MetadataScanner - 3 controllers, 6 methods', async () => {
    resetContainer()
    const processor = new MockProcessor()
    container.registerInstance('DecoratorProcessor', processor)
    const scanner = new MetadataScanner([processor])

    scanner.scan([TestController1, TestController2, TestController3])
  })

  bench.add('MetadataScanner - 10 controllers (simulated)', async () => {
    resetContainer()
    const processor = new MockProcessor()
    container.registerInstance('DecoratorProcessor', processor)
    const scanner = new MetadataScanner([processor])

    const controllers = Array.from({ length: 10 }, () => TestController1)
    scanner.scan(controllers)
  })

  return bench
}
