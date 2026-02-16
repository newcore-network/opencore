// @ts-nocheck - Decorators use legacy format, tests pass correctly
import 'reflect-metadata'
import { describe, expect, it } from 'vitest'
import { OnLibraryEvent } from '../../../../src/runtime/server/decorators/onLibraryEvent'
import { METADATA_KEYS } from '../../../../src/runtime/server/system/metadata-server.keys'

describe('@OnLibraryEvent decorator (server)', () => {
  it('stores library event metadata', () => {
    class CharacterController {
      @OnLibraryEvent('characters', 'session:created')
      onSessionCreated() {}
    }

    const metadata = Reflect.getMetadata(
      METADATA_KEYS.LIBRARY_EVENT,
      CharacterController.prototype,
      'onSessionCreated',
    )

    expect(metadata).toBeDefined()
    expect(metadata.libraryName).toBe('characters')
    expect(metadata.eventName).toBe('session:created')
    expect(metadata.eventId).toBe('characters:session:created')
  })

  it('does not alter method behavior', () => {
    class CharacterController {
      @OnLibraryEvent('characters', 'created')
      format(id: string) {
        return `char:${id}`
      }
    }

    const instance = new CharacterController()
    expect(instance.format('10')).toBe('char:10')
  })
})
