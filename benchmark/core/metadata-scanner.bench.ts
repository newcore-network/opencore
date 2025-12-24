import { Bench } from 'tinybench'
import { container } from 'tsyringe'
import { MetadataScanner } from '../../src/kernel/di/metadata.scanner'
import { DecoratorProcessor } from '../../src/kernel/di/decorator-processor'
import { METADATA_KEYS } from '../../src/runtime/server/system/metadata-server.keys'
import { resetContainer } from '../../tests/helpers/di.helper'
import { injectable } from 'tsyringe'

class MockProcessor implements DecoratorProcessor {
  readonly metadataKey = METADATA_KEYS.COMMAND
  processCount = 0

  process(_target: any, _methodName: string, _metadata: any): void {
    this.processCount++
  }
}

class TestController1 {
  method1() {}

  method2() {}

  method3() {}
}

class TestController2 {
  method1() {}

  method2() {}
}

class TestController3 {
  method1() {}
}

// Make controllers injectable for MetadataScanner (container.resolve)
injectable()(TestController1)
injectable()(TestController2)
injectable()(TestController3)

// Register command metadata manually to avoid decorator runtime incompatibilities under tsx
function defineCommandMeta(target: any, methodName: string, command: string) {
  Reflect.defineMetadata(
    METADATA_KEYS.COMMAND,
    {
      command,
      methodName,
      target: target.constructor,
      paramTypes: [],
      paramNames: [],
      expectsPlayer: false,
    },
    target,
    methodName,
  )
}

defineCommandMeta(TestController1.prototype, 'method1', 'test1')
defineCommandMeta(TestController1.prototype, 'method2', 'test2')
defineCommandMeta(TestController1.prototype, 'method3', 'test3')
defineCommandMeta(TestController2.prototype, 'method1', 'test4')
defineCommandMeta(TestController2.prototype, 'method2', 'test5')
defineCommandMeta(TestController3.prototype, 'method1', 'test6')

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
