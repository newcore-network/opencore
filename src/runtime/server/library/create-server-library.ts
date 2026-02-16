import { coreLogger } from '../../../kernel/logger'
import { createLibraryCore, createLibraryConfigAccessor } from '../../core/library'
import { OpenCoreServerLibrary } from '../../core/library/types'

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
  const base = createLibraryCore(name, opts)
  const logger = coreLogger.server(`Library:${base.name}`)

  return {
    ...base,
    side: 'server',
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
