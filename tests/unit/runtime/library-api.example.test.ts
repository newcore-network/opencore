import { beforeEach, describe, expect, it, vi } from 'vitest'
import { EventsAPI, IEngineEvents } from '../../../src/adapters'
import { GLOBAL_CONTAINER } from '../../../src/kernel/di/container'
import { createClientLibrary } from '../../../src/runtime/client/library'
import { di } from '../../../src/runtime/client/client-container'
import { createServerLibrary } from '../../../src/runtime/server/library'

describe('library API wrappers', () => {
  beforeEach(() => {
    GLOBAL_CONTAINER.reset()
    di.reset()
  })

  it('provides server wrapper with internal and external APIs', () => {
    const emitEngine = vi.fn()
    const emitNet = vi.fn()

    GLOBAL_CONTAINER.registerInstance(
      IEngineEvents as any,
      { emit: emitEngine, on: vi.fn() } as unknown as IEngineEvents,
    )
    GLOBAL_CONTAINER.registerInstance(
      EventsAPI as any,
      {
        on: vi.fn(),
        emit: emitNet,
      } as unknown as EventsAPI<'server'>,
    )

    const characters = createServerLibrary('characters')
    const internalHandler = vi.fn()
    characters.on('created', internalHandler)
    characters.emit('created', { id: 'x' })
    characters.emitExternal('created', { id: 'x' })
    characters.emitNetExternal('created', 1, { id: 'x' })

    expect(internalHandler).toHaveBeenCalledWith({ id: 'x' })
    expect(emitEngine).toHaveBeenCalledWith('opencore:characters:created', { id: 'x' })
    expect(emitNet).toHaveBeenCalledWith('opencore:characters:created', 1, { id: 'x' })
    expect(characters.side).toBe('server')
  })

  it('provides client wrapper for namespaced server emission', () => {
    const emitNet = vi.fn()
    di.registerInstance(
      EventsAPI as any,
      {
        on: vi.fn(),
        emit: emitNet,
      } as unknown as EventsAPI<'client'>,
    )

    const characters = createClientLibrary('characters')
    characters.emitServer('select', { characterId: 'x' })

    expect(emitNet).toHaveBeenCalledWith('opencore:characters:select', { characterId: 'x' })
    expect(characters.side).toBe('client')
  })
})
