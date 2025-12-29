import { Bench } from 'tinybench'
import { container, DependencyContainer, injectable } from 'tsyringe'

@injectable()
class ServiceA {
  doWork() {
    return 'A'
  }
}

@injectable()
class ServiceB {
  constructor(private serviceA: ServiceA) {}

  doWork() {
    return this.serviceA.doWork() + 'B'
  }
}

@injectable()
class ServiceC {
  constructor(
    private serviceA: ServiceA,
    private serviceB: ServiceB,
  ) {}

  doWork() {
    return this.serviceA.doWork() + this.serviceB.doWork() + 'C'
  }
}

@injectable()
class ServiceD {
  constructor(
    private serviceA: ServiceA,
    private serviceB: ServiceB,
    private serviceC: ServiceC,
  ) {}

  doWork() {
    return this.serviceA.doWork() + this.serviceB.doWork() + this.serviceC.doWork() + 'D'
  }
}

export async function runDependencyInjectionBenchmark(): Promise<Bench> {
  const bench = new Bench({ time: 1000 })

  bench.add('DI - Resolve simple service', async () => {
    const testContainer = container.createChildContainer()
    testContainer.register(ServiceA, { useClass: ServiceA })
    testContainer.resolve(ServiceA)
  })

  bench.add('DI - Resolve with 1 dependency', async () => {
    const testContainer = container.createChildContainer()
    testContainer.register(ServiceA, { useClass: ServiceA })
    testContainer.register(ServiceB, { useClass: ServiceB })
    testContainer.resolve(ServiceB)
  })

  bench.add('DI - Resolve with 2 dependencies', async () => {
    const testContainer = container.createChildContainer()
    testContainer.register(ServiceA, { useClass: ServiceA })
    testContainer.register(ServiceB, { useClass: ServiceB })
    testContainer.register(ServiceC, { useClass: ServiceC })
    testContainer.resolve(ServiceC)
  })

  bench.add('DI - Resolve with 3 dependencies', async () => {
    const testContainer = container.createChildContainer()
    testContainer.register(ServiceA, { useClass: ServiceA })
    testContainer.register(ServiceB, { useClass: ServiceB })
    testContainer.register(ServiceC, { useClass: ServiceC })
    testContainer.register(ServiceD, { useClass: ServiceD })
    testContainer.resolve(ServiceD)
  })

  bench.add('DI - Resolve 100 times (simple)', async () => {
    const testContainer = container.createChildContainer()
    testContainer.register(ServiceA, { useClass: ServiceA })
    for (let i = 0; i < 100; i++) {
      testContainer.resolve(ServiceA)
    }
  })

  bench.add('DI - Resolve 100 times (complex)', async () => {
    const testContainer = container.createChildContainer()
    testContainer.register(ServiceA, { useClass: ServiceA })
    testContainer.register(ServiceB, { useClass: ServiceB })
    testContainer.register(ServiceC, { useClass: ServiceC })
    testContainer.register(ServiceD, { useClass: ServiceD })
    for (let i = 0; i < 100; i++) {
      testContainer.resolve(ServiceD)
    }
  })

  return bench
}
