import { LibraryEventId, LibraryEventName, LibraryName } from './types'

/**
 * Builds a deterministic library event identifier.
 *
 * @example
 * `characters:session:created`
 */
export function buildLibraryEventId(
  libraryName: LibraryName,
  eventName: LibraryEventName,
): LibraryEventId {
  return `${libraryName}:${eventName}`
}
