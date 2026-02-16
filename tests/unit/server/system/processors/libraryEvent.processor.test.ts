import { describe, expect, it, vi } from 'vitest'
import { emitLibraryEvent } from '../../../../../src/runtime/server/bus/library-event.bus'
import { LibraryEventProcessor } from '../../../../../src/runtime/server/system/processors/libraryEvent.processor'

describe('LibraryEventProcessor', () => {
  it('invokes registered handler when library event is emitted', () => {
    const processor = new LibraryEventProcessor()

    class CharacterController {
      receivedPayload: unknown
      receivedMeta: unknown

      onCreated(payload: unknown, meta: unknown) {
        this.receivedPayload = payload
        this.receivedMeta = meta
      }
    }

    const instance = new CharacterController()
    const metadata = {
      libraryName: 'characters',
      eventName: 'created',
      eventId: 'characters:created',
    }

    processor.process(instance, 'onCreated', metadata)

    emitLibraryEvent(metadata.eventId, {
      payload: { id: 'char-1' },
      meta: {
        libraryName: 'characters',
        eventName: 'created',
        eventId: metadata.eventId,
        namespace: 'opencore:characters',
        side: 'server',
      },
    })

    expect(instance.receivedPayload).toEqual({ id: 'char-1' })
    expect(instance.receivedMeta).toEqual({
      libraryName: 'characters',
      eventName: 'created',
      eventId: metadata.eventId,
      namespace: 'opencore:characters',
      side: 'server',
    })
  })

  it('does not throw if method does not exist', () => {
    const processor = new LibraryEventProcessor()
    const instance = {}
    const metadata = {
      libraryName: 'characters',
      eventName: 'missing',
      eventId: `characters:missing:${Date.now()}`,
    }

    expect(() => processor.process(instance, 'missingMethod', metadata)).not.toThrow()
  })

  it('isolates listeners by event identifier', () => {
    const processor = new LibraryEventProcessor()

    class CharacterController {
      onCreated = vi.fn()
    }

    const instance = new CharacterController()
    const metadata = {
      libraryName: 'characters',
      eventName: 'created',
      eventId: `characters:created:${Date.now()}`,
    }

    processor.process(instance, 'onCreated', metadata)

    emitLibraryEvent(`characters:other:${Date.now()}`, {
      payload: { id: 'ignored' },
      meta: {
        libraryName: 'characters',
        eventName: 'other',
        eventId: `characters:other:${Date.now()}`,
        namespace: 'opencore:characters',
        side: 'server',
      },
    })

    expect(instance.onCreated).not.toHaveBeenCalled()
  })
})
