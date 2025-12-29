import { Bench } from 'tinybench'
import { injectable } from 'tsyringe'
import { METADATA_KEYS } from '../../src/runtime/server/system/metadata-server.keys'

class TestController {
  async testMethod() {
    return 'test'
  }
}

class TempController1 {
  method() {}
}

class TempController2 {
  method() {}
}

class TempController3 {
  method() {}
}

class TempController4 {
  method() {}
}

// Make benchmark controllers injectable (not strictly required for this file, but consistent with framework usage)
injectable()(TestController)
injectable()(TempController1)
injectable()(TempController2)
injectable()(TempController3)
injectable()(TempController4)

// Register metadata manually to avoid decorator runtime incompatibilities under tsx
Reflect.defineMetadata(
  METADATA_KEYS.COMMAND,
  {
    command: 'test',
    methodName: 'testMethod',
    target: TestController,
    paramTypes: [],
    paramNames: [],
    expectsPlayer: false,
  },
  TestController.prototype,
  'testMethod',
)
Reflect.defineMetadata('core:guard', { rank: 1 }, TestController.prototype, 'testMethod')

Reflect.defineMetadata(
  METADATA_KEYS.COMMAND,
  {
    command: 'temp',
    methodName: 'method',
    target: TempController1,
    paramTypes: [],
    paramNames: [],
    expectsPlayer: false,
  },
  TempController1.prototype,
  'method',
)

Reflect.defineMetadata(
  METADATA_KEYS.COMMAND,
  {
    command: 'temp',
    methodName: 'method',
    target: TempController2,
    paramTypes: [],
    paramNames: [],
    expectsPlayer: false,
  },
  TempController2.prototype,
  'method',
)
Reflect.defineMetadata('core:guard', { rank: 1 }, TempController2.prototype, 'method')

Reflect.defineMetadata(
  METADATA_KEYS.COMMAND,
  {
    command: 'temp',
    methodName: 'method',
    target: TempController3,
    paramTypes: [],
    paramNames: [],
    expectsPlayer: false,
  },
  TempController3.prototype,
  'method',
)
Reflect.defineMetadata('core:guard', { rank: 1 }, TempController3.prototype, 'method')

// Keep a throttle marker metadata for benchmark parity (Throttle decorator uses runtime wrapping, which we skip here)
Reflect.defineMetadata(
  'core:throttle',
  { limit: 5, windowMs: 1000 },
  TempController3.prototype,
  'method',
)

Reflect.defineMetadata(
  METADATA_KEYS.COMMAND,
  {
    command: 'temp',
    methodName: 'method',
    target: TempController4,
    paramTypes: [],
    paramNames: [],
    expectsPlayer: false,
  },
  TempController4.prototype,
  'method',
)
Reflect.defineMetadata('core:guard', { rank: 1 }, TempController4.prototype, 'method')

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
