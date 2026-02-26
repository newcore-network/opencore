import { coreLogger, LogDomain } from '../../../kernel/logger'
import { LibraryEventEnvelope, LibraryEventId } from '../../core/library/types'

type LibraryEventHandler = (event: LibraryEventEnvelope) => void | Promise<void>

const handlers = new Map<LibraryEventId, Set<LibraryEventHandler>>()
const libraryEventLogger = coreLogger.child('LibraryEvent', LogDomain.CLIENT)

export function onLibraryEvent(eventId: LibraryEventId, handler: LibraryEventHandler): () => void {
  const eventHandlers = handlers.get(eventId) ?? new Set<LibraryEventHandler>()
  eventHandlers.add(handler)
  handlers.set(eventId, eventHandlers)

  return () => {
    const current = handlers.get(eventId)
    if (!current) return
    current.delete(handler)
    if (current.size === 0) handlers.delete(eventId)
  }
}

export function emitLibraryEvent(eventId: LibraryEventId, event: LibraryEventEnvelope): void {
  const eventHandlers = handlers.get(eventId)
  if (!eventHandlers || eventHandlers.size === 0) return

  for (const handler of [...eventHandlers]) {
    Promise.resolve(handler(event)).catch((error) => {
      libraryEventLogger.error(
        `Handler error in library event`,
        {
          eventId,
        },
        error as Error,
      )
    })
  }
}
