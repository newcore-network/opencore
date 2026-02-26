import { Bench } from 'tinybench'
import { onFrameworkEvent } from '../../src/runtime/server/api'
import { emitFrameworkEvent } from '../../src/runtime/server/bus/internal-event.bus'

export async function runEventBusBenchmark(): Promise<Bench> {
  const bench = new Bench({ time: 1000 })

  bench.add('EventBus - Register handler', async () => {
    const unsubscribe = onFrameworkEvent('internal:playerSessionCreated', () => {})
    unsubscribe()
  })

  bench.add('EventBus - Emit to 1 handler', async () => {
    const unsubscribe = onFrameworkEvent('internal:playerSessionCreated', () => {})
    emitFrameworkEvent('internal:playerSessionCreated', { clientId: 1, license: 'test' })
    unsubscribe()
  })

  bench.add('EventBus - Emit to 10 handlers', async () => {
    const unsubscribes: (() => void)[] = []
    for (let i = 0; i < 10; i++) {
      unsubscribes.push(
        onFrameworkEvent('internal:playerSessionCreated', () => {
          // Handler
        }),
      )
    }
    emitFrameworkEvent('internal:playerSessionCreated', { clientId: 1, license: 'test' })
    unsubscribes.forEach((unsub) => unsub())
  })

  bench.add('EventBus - Emit to 100 handlers', async () => {
    const unsubscribes: (() => void)[] = []
    for (let i = 0; i < 100; i++) {
      unsubscribes.push(
        onFrameworkEvent('internal:playerSessionCreated', () => {
          // Handler
        }),
      )
    }
    emitFrameworkEvent('internal:playerSessionCreated', { clientId: 1, license: 'test' })
    unsubscribes.forEach((unsub) => unsub())
  })

  bench.add('EventBus - 100 emissions to 1 handler', async () => {
    const unsubscribe = onFrameworkEvent('internal:playerSessionCreated', () => {})
    for (let i = 0; i < 100; i++) {
      emitFrameworkEvent('internal:playerSessionCreated', { clientId: i, license: 'test' })
    }
    unsubscribe()
  })

  bench.add('EventBus - Multiple event types', async () => {
    const unsubscribes: (() => void)[] = []
    unsubscribes.push(
      onFrameworkEvent('internal:playerSessionCreated', () => {}),
      onFrameworkEvent('internal:playerSessionDestroyed', () => {}),
    )
    emitFrameworkEvent('internal:playerSessionCreated', { clientId: 1, license: 'test' })
    emitFrameworkEvent('internal:playerSessionDestroyed', { clientId: 1 })
    unsubscribes.forEach((unsub) => unsub())
  })

  bench.add('EventBus - Handler with work', async () => {
    let sum = 0
    const unsubscribe = onFrameworkEvent('internal:playerSessionCreated', (payload) => {
      sum += payload.clientId
    })
    for (let i = 0; i < 100; i++) {
      emitFrameworkEvent('internal:playerSessionCreated', { clientId: i, license: 'test' })
    }
    unsubscribe()
  })

  return bench
}
