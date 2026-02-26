// @ts-nocheck - Decorators use legacy format, tests pass correctly
import 'reflect-metadata'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createClientLibrary } from '../../../src/runtime/client/library'
import { OnLibraryEvent as ClientOnLibraryEvent } from '../../../src/runtime/client/decorators/onLibraryEvent'
import { METADATA_KEYS as CLIENT_METADATA_KEYS } from '../../../src/runtime/client/system/metadata-client.keys'
import { ClientLibraryEventProcessor } from '../../../src/runtime/client/system/processors/libraryEvent.processor'
import { createServerLibrary } from '../../../src/runtime/server/library'
import { OnLibraryEvent as ServerOnLibraryEvent } from '../../../src/runtime/server/decorators/onLibraryEvent'
import { METADATA_KEYS as SERVER_METADATA_KEYS } from '../../../src/runtime/server/system/metadata-server.keys'
import { LibraryEventProcessor } from '../../../src/runtime/server/system/processors/libraryEvent.processor'

describe('library events with OnLibraryEvent', () => {
  beforeEach(() => {
    vi.stubGlobal('emit', vi.fn())
    vi.stubGlobal('emitNet', vi.fn())
  })

  it('dispatches server library.emit events to @OnLibraryEvent handlers', () => {
    class CharacterListeners {
      payload: unknown
      meta: unknown

      @ServerOnLibraryEvent('characters', 'session:created')
      onSessionCreated(payload: unknown, meta: unknown) {
        this.payload = payload
        this.meta = meta
      }
    }

    const instance = new CharacterListeners()
    const metadata = Reflect.getMetadata(
      SERVER_METADATA_KEYS.LIBRARY_EVENT,
      CharacterListeners.prototype,
      'onSessionCreated',
    )

    const processor = new LibraryEventProcessor()
    processor.process(instance, 'onSessionCreated', metadata)

    const library = createServerLibrary('characters')
    library.emit('session:created', { sessionId: 's-1' })

    expect(instance.payload).toEqual({ sessionId: 's-1' })
    expect(instance.meta).toEqual({
      libraryName: 'characters',
      eventName: 'session:created',
      eventId: 'characters:session:created',
      namespace: 'opencore:characters',
      side: 'server',
    })
  })

  it('does not dispatch emitExternal to @OnLibraryEvent handlers', () => {
    class CharacterListeners {
      called = vi.fn()

      @ServerOnLibraryEvent('characters', 'session:created')
      onSessionCreated() {
        this.called()
      }
    }

    const instance = new CharacterListeners()
    const metadata = Reflect.getMetadata(
      SERVER_METADATA_KEYS.LIBRARY_EVENT,
      CharacterListeners.prototype,
      'onSessionCreated',
    )

    const processor = new LibraryEventProcessor()
    processor.process(instance, 'onSessionCreated', metadata)

    const library = createServerLibrary('characters')
    library.emitExternal('session:created', { sessionId: 's-1' })

    expect(instance.called).not.toHaveBeenCalled()
  })

  it('dispatches client library.emit events to @OnLibraryEvent handlers', () => {
    class ClientCharacterListeners {
      payload: unknown
      meta: unknown

      @ClientOnLibraryEvent('characters', 'selected')
      onCharacterSelected(payload: unknown, meta: unknown) {
        this.payload = payload
        this.meta = meta
      }
    }

    const instance = new ClientCharacterListeners()
    const metadata = Reflect.getMetadata(
      CLIENT_METADATA_KEYS.LIBRARY_EVENT,
      ClientCharacterListeners.prototype,
      'onCharacterSelected',
    )

    const processor = new ClientLibraryEventProcessor()
    processor.process(instance, 'onCharacterSelected', metadata)

    const library = createClientLibrary('characters')
    library.emit('selected', { characterId: 'c-9' })

    expect(instance.payload).toEqual({ characterId: 'c-9' })
    expect(instance.meta).toEqual({
      libraryName: 'characters',
      eventName: 'selected',
      eventId: 'characters:selected',
      namespace: 'opencore:characters',
      side: 'client',
    })
  })
})
