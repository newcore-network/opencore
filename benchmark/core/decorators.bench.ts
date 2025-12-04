import { Bench } from 'tinybench'
import { METADATA_KEYS } from '../../src/server/system/metadata-server.keys'
import { Command } from '../../src/server/decorators/command'
import { Controller } from '../../src/server/decorators/controller'
import { Guard } from '../../src/server/decorators/guard'
import { Throttle } from '../../src/server/decorators/throttle'

// @ts-ignore - experimentalDecorators compatibility
@Controller()
class TestController {
  // @ts-ignore - experimentalDecorators compatibility
  @Command('test')
  // @ts-ignore - experimentalDecorators compatibility
  @Guard({ rank: 1 })
  async testMethod() {
    return 'test'
  }
}

// Benchmark classes defined at module level to ensure PropertyDescriptor is available
// @ts-ignore - experimentalDecorators compatibility
class TempController1 {
  // @ts-ignore - experimentalDecorators compatibility
  @Command('temp')
  method() {}
}

// @ts-ignore - experimentalDecorators compatibility
class TempController2 {
  // @ts-ignore - experimentalDecorators compatibility
  @Command('temp')
  // @ts-ignore - experimentalDecorators compatibility
  @Guard({ rank: 1 })
  method() {}
}

// @ts-ignore - experimentalDecorators compatibility
class TempController3 {
  // @ts-ignore - experimentalDecorators compatibility
  @Command('temp')
  // @ts-ignore - experimentalDecorators compatibility
  @Guard({ rank: 1 })
  // @ts-ignore - experimentalDecorators compatibility
  @Throttle(5, 1000)
  method() {}
}

// @ts-ignore - experimentalDecorators compatibility
class TempController4 {
  // @ts-ignore - experimentalDecorators compatibility
  @Command('temp')
  // @ts-ignore - experimentalDecorators compatibility
  @Guard({ rank: 1 })
  method() {}
}

export async function runDecoratorsBenchmark(): Promise<Bench> {
  const bench = new Bench({ time: 1000 })

  bench.add('Decorators - Define metadata (Command)', async () => {
    new TempController1()
  })

  bench.add('Decorators - Define metadata (Command + Guard)', async () => {
    new TempController2()
  })

  bench.add('Decorators - Define metadata (Command + Guard + Throttle)', async () => {
    new TempController3()
  })

  bench.add('Decorators - Read metadata (single)', async () => {
    const instance = new TestController()
    const proto = Object.getPrototypeOf(instance)
    Reflect.getMetadata(METADATA_KEYS.COMMAND, proto, 'testMethod')
  })

  bench.add('Decorators - Read metadata (multiple)', async () => {
    const instance = new TestController()
    const proto = Object.getPrototypeOf(instance)
    Reflect.getMetadata(METADATA_KEYS.COMMAND, proto, 'testMethod')
    Reflect.getMetadata('core:guard', proto, 'testMethod')
  })

  bench.add('Decorators - 100 metadata reads', async () => {
    const instance = new TestController()
    const proto = Object.getPrototypeOf(instance)
    for (let i = 0; i < 100; i++) {
      Reflect.getMetadata(METADATA_KEYS.COMMAND, proto, 'testMethod')
    }
  })

  bench.add('Decorators - Full stack (define + read)', async () => {
    const instance = new TempController4()
    const proto = Object.getPrototypeOf(instance)
    Reflect.getMetadata(METADATA_KEYS.COMMAND, proto, 'method')
    Reflect.getMetadata('core:guard', proto, 'method')
  })

  return bench
}
