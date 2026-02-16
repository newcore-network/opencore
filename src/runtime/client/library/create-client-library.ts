import { coreLogger } from '../../../kernel/logger'
import { createLibraryCore, createLibraryConfigAccessor } from '../../core/library'
import { OpenCoreClientLibrary } from '../../core/library/types'

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
  const base = createLibraryCore(name, opts)
  const logger = coreLogger.client(`Library:${base.name}`)

  return {
    ...base,
    side: 'client',
    emitServer(eventName, payload) {
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
