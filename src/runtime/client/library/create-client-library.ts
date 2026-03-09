import { EventsAPI } from '../../../adapters/contracts/transport/events.api'
import { di } from '../client-container'
import { coreLogger } from '../../../kernel/logger'
import {
  buildLibraryEventId,
  createLibraryBase,
  createLibraryConfigAccessor,
} from '../../core/library'
import { LibraryEventEnvelope, OpenCoreClientLibrary } from '../../core/library/types'
import { emitLibraryEvent } from '../bus/library-event.bus'

/**
 * Creates a client-side OpenCore library wrapper.
 *
 * @remarks
 * - Internal events use the local in-memory library bus.
 * - `emitServer` sends a namespaced net event to server following
 *   `opencore:<libName>:<eventName>` (or custom namespace).
 * - For request/response patterns, prefer RPC.
 */
export function createClientLibrary(
  name: string,
  opts?: {
    namespace?: string
  },
): OpenCoreClientLibrary {
  const base = createLibraryBase(name, opts)
  const logger = coreLogger.client(`Library:${base.name}`)
  const emitInternal = base.emit
  const events = di.isRegistered(EventsAPI as any)
    ? (di.resolve(EventsAPI as any) as EventsAPI<'client'>)
    : null

  return {
    ...base,
    side: 'client',
    emit(eventName, payload) {
      emitInternal(eventName, payload)

      const eventId = buildLibraryEventId(base.name, eventName)
      const envelope: LibraryEventEnvelope = {
        payload,
        meta: {
          libraryName: base.name,
          eventName,
          eventId,
          namespace: base.namespace,
          side: 'client',
        },
      }

      emitLibraryEvent(eventId, envelope)
    },
    emitServer(eventName, payload) {
      if (events) {
        events.emit(base.buildEventName(eventName), payload)
        return
      }

      emitNet(base.buildEventName(eventName), payload)
    },
    getLogger() {
      return logger
    },
    getConfig<TConfig = Record<string, unknown>>() {
      return createLibraryConfigAccessor<TConfig>(base.namespace)
    },
  }
}
