import { createLibraryBus } from './library-bus'
import { LibraryNamespace, OpenCoreLibraryBase } from './types'

/**
 * Creates the shared base API for an OpenCore library. (Server and Client compatibility)
 *
 * @remarks
 * The base contains only library-local events (internal bus) and namespaced
 * event-name building. External bridge behavior is added by server/client wrappers.
 */
export function createLibraryCore(
  name: string,
  opts?: {
    namespace?: string
  },
): OpenCoreLibraryBase {
  const bus = createLibraryBus()
  const namespace: LibraryNamespace = opts?.namespace ?? `opencore:${name}`

  return {
    name,
    namespace,
    on: bus.on,
    once: bus.once,
    off: bus.off,
    emit: bus.emit,
    buildEventName(eventName: string): string {
      return `${namespace}:${eventName}`
    },
  }
}
