import { Bench } from 'tinybench'
import { onCoreEvent, emitCoreEvent } from '../../src/server/bus/core-event-bus'
import type { CoreEventMap } from '../../src/server/types/core-events'

export async function runEventBusBenchmark(): Promise<Bench> {
  const bench = new Bench({ time: 1000 })

  bench.add('EventBus - Register handler', async () => {
    const unsubscribe = onCoreEvent('core:playerSessionCreated', () => {})
    unsubscribe()
  })

  bench.add('EventBus - Emit to 1 handler', async () => {
    const unsubscribe = onCoreEvent('core:playerSessionCreated', () => {})
    emitCoreEvent('core:playerSessionCreated', { clientId: 1, license: 'test' })
    unsubscribe()
  })

  bench.add('EventBus - Emit to 10 handlers', async () => {
    const unsubscribes: (() => void)[] = []
    for (let i = 0; i < 10; i++) {
      unsubscribes.push(
        onCoreEvent('core:playerSessionCreated', () => {
          // Handler
        }),
      )
    }
    emitCoreEvent('core:playerSessionCreated', { clientId: 1, license: 'test' })
    unsubscribes.forEach((unsub) => unsub())
  })

  bench.add('EventBus - Emit to 100 handlers', async () => {
    const unsubscribes: (() => void)[] = []
    for (let i = 0; i < 100; i++) {
      unsubscribes.push(
        onCoreEvent('core:playerSessionCreated', () => {
          // Handler
        }),
      )
    }
    emitCoreEvent('core:playerSessionCreated', { clientId: 1, license: 'test' })
    unsubscribes.forEach((unsub) => unsub())
  })

  bench.add('EventBus - 100 emissions to 1 handler', async () => {
    const unsubscribe = onCoreEvent('core:playerSessionCreated', () => {})
    for (let i = 0; i < 100; i++) {
      emitCoreEvent('core:playerSessionCreated', { clientId: i, license: 'test' })
    }
    unsubscribe()
  })

  bench.add('EventBus - Multiple event types', async () => {
    const unsubscribes: (() => void)[] = []
    unsubscribes.push(
      onCoreEvent('core:playerSessionCreated', () => {}),
      onCoreEvent('core:playerSessionDestroyed', () => {}),
    )
    emitCoreEvent('core:playerSessionCreated', { clientId: 1, license: 'test' })
    emitCoreEvent('core:playerSessionDestroyed', { clientId: 1 })
    unsubscribes.forEach((unsub) => unsub())
  })

  bench.add('EventBus - Handler with work', async () => {
    let sum = 0
    const unsubscribe = onCoreEvent('core:playerSessionCreated', (payload) => {
      sum += payload.clientId
    })
    for (let i = 0; i < 100; i++) {
      emitCoreEvent('core:playerSessionCreated', { clientId: i, license: 'test' })
    }
    unsubscribe()
  })

  return bench
}
