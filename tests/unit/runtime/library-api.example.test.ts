import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createClientLibrary } from '../../../src/runtime/client/library'
import { createServerLibrary } from '../../../src/runtime/server/library'

describe('library API wrappers', () => {
  beforeEach(() => {
    vi.stubGlobal('emit', vi.fn())
    vi.stubGlobal('emitNet', vi.fn())
  })

  it('provides server wrapper with internal and external APIs', () => {
    const characters = createServerLibrary('characters')

    const internalHandler = vi.fn()
    characters.on('created', internalHandler)
    characters.emit('created', { id: 'x' })
    characters.emitExternal('created', { id: 'x' })
    characters.emitNetExternal('created', 1, { id: 'x' })

    expect(internalHandler).toHaveBeenCalledWith({ id: 'x' })
    expect(emit).toHaveBeenCalledWith('opencore:characters:created', { id: 'x' })
    expect(emitNet).toHaveBeenCalledWith('opencore:characters:created', 1, { id: 'x' })

    const logger = characters.getLogger()
    logger.debug('server logger is available')
    expect(characters.side).toBe('server')
  })

  it('provides client wrapper for namespaced server emission', () => {
    const characters = createClientLibrary('characters')

    characters.emitServer('select', { characterId: 'x' })

    expect(emitNet).toHaveBeenCalledWith('opencore:characters:select', { characterId: 'x' })
    expect(characters.side).toBe('client')
  })
})
