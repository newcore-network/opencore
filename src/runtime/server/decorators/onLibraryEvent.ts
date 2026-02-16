import { buildLibraryEventId } from '../../core/library'
import { LibraryEventName, LibraryName } from '../../core/library/types'
import { METADATA_KEYS } from '../system/metadata-server.keys'

export interface LibraryEventDecoratorMetadata {
  libraryName: LibraryName
  eventName: LibraryEventName
  eventId: string
}

/**
 * Registers a method as a listener for a runtime library event.
 *
 * @remarks
 * The event is emitted when a library wrapper calls `library.emit(...)`.
 * This decorator stores metadata only; listeners are bound during bootstrap.
 *
 * @param libraryName - Library identifier (for example: `characters`).
 * @param eventName - Event name emitted by the library (for example: `session:created`).
 */
export function OnLibraryEvent(libraryName: LibraryName, eventName: LibraryEventName) {
  return (target: object, propertyKey: string | symbol, _descriptor: PropertyDescriptor): void => {
    const metadata: LibraryEventDecoratorMetadata = {
      libraryName,
      eventName,
      eventId: buildLibraryEventId(libraryName, eventName),
    }

    Reflect.defineMetadata(METADATA_KEYS.LIBRARY_EVENT, metadata, target, propertyKey)
  }
}
