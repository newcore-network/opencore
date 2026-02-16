import { describe, expect, it, vi } from 'vitest'
import { createLibraryCore } from '../../../../src/runtime/core/library'

describe('createLibraryCore', () => {
  it('supports on + emit for internal events', () => {
    const library = createLibraryCore('characters')
    const handler = vi.fn()

    library.on('created', handler)
    library.emit('created', { id: 'x' })

    expect(handler).toHaveBeenCalledWith({ id: 'x' })
  })

  it('supports once subscriptions', () => {
    const library = createLibraryCore('characters')
    const handler = vi.fn()

    library.once('created', handler)
    library.emit('created', { id: 'x' })
    library.emit('created', { id: 'y' })

    expect(handler).toHaveBeenCalledTimes(1)
  })

  it('supports off subscriptions', () => {
    const library = createLibraryCore('characters')
    const handler = vi.fn()

    library.on('created', handler)
    library.off('created', handler)
    library.emit('created', { id: 'x' })

    expect(handler).not.toHaveBeenCalled()
  })

  it('builds namespaced event names with the exact opencore format', () => {
    const library = createLibraryCore('characters')

    expect(library.namespace).toBe('opencore:characters')
    expect(library.buildEventName('created')).toBe('opencore:characters:created')
  })
})
