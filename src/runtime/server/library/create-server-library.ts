import { coreLogger } from '../../../kernel/logger'
import {
  buildLibraryEventId,
  createLibraryBase,
  createLibraryConfigAccessor,
} from '../../core/library'
import { LibraryEventEnvelope, OpenCoreServerLibrary } from '../../core/library/types'
import { emitLibraryEvent } from '../bus/library-event.bus'

/**
 * Creates a server-side OpenCore library wrapper.
 *
 * @remarks
 * - Internal events use the local in-memory library bus.
 * - `emitExternal` emits a server-side cross-resource event using the exact
 *   naming convention `opencore:<libName>:<eventName>` (or custom namespace).
 * - This helper does not replace RPC for request/response flows.
 */
export function createServerLibrary(
  name: string,
  opts?: {
    namespace?: string
  },
): OpenCoreServerLibrary {
  const base = createLibraryBase(name, opts)
  const logger = coreLogger.server(`Library:${base.name}`)
  const emitInternal = base.emit

  return {
    ...base,
    side: 'server',
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
          side: 'server',
        },
      }

      emitLibraryEvent(eventId, envelope)
    },
    emitExternal(eventName, payload) {
      emit(base.buildEventName(eventName), payload)
    },
    emitNetExternal(eventName, target, payload) {
      emitNet(base.buildEventName(eventName), target, payload)
    },
    getLogger() {
      return logger
    },
    getConfig<TConfig = Record<string, unknown>>() {
      return createLibraryConfigAccessor<TConfig>(base.namespace)
    },
  }
}
