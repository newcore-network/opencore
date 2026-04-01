import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  configureFrameworkEventBridge,
  emitFrameworkEvent,
  onFrameworkEvent,
} from '../../../../src/runtime/server/bus/internal-event.bus'
import { SYSTEM_EVENTS } from '../../../../src/runtime/shared/types/system-types'

describe('internal-event bus bridge', () => {
  beforeEach(() => {
    configureFrameworkEventBridge({ mode: 'STANDALONE' })
  })

  it('serializes framework events when CORE emits them', () => {
    const emit = vi.fn()

    configureFrameworkEventBridge({
      mode: 'CORE',
      engineEvents: {
        on: vi.fn(),
        onRuntime: vi.fn(),
        emit,
        getRuntimeEventMap: vi.fn(() => ({})),
      } as any,
    })

    emitFrameworkEvent('internal:playerFullyConnected', {
      player: { clientID: 42 } as any,
    })

    expect(emit).toHaveBeenCalledWith(SYSTEM_EVENTS.framework.dispatch, {
      event: 'internal:playerFullyConnected',
      payload: { clientId: 42 },
    })
  })

  it('hydrates bridged framework events in RESOURCE mode', () => {
    let transportHandler: ((envelope: unknown) => void) | undefined
    const player = { clientID: 7, name: 'Tester' }
    const listener = vi.fn()
    const unsubscribe = onFrameworkEvent('internal:playerFullyConnected', listener)

    configureFrameworkEventBridge({
      mode: 'RESOURCE',
      engineEvents: {
        on: vi.fn((_event: string, handler: (envelope: unknown) => void) => {
          transportHandler = handler
        }),
        onRuntime: vi.fn(),
        emit: vi.fn(),
        getRuntimeEventMap: vi.fn(() => ({})),
      } as any,
      players: {
        getByClient: vi.fn((clientId: number) => (clientId === 7 ? (player as any) : undefined)),
      } as any,
    })

    transportHandler?.({
      event: 'internal:playerFullyConnected',
      payload: { clientId: 7 },
    })

    expect(listener).toHaveBeenCalledWith({ player })
    unsubscribe()
  })
})
