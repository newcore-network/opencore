import { OpenCoreLibraryConfigAccessor } from './types'

type LibraryConfigStore = Record<string, Record<string, unknown>>

declare global {
  // biome-ignore lint/style/noVar: global var is used as optional config source.
  var __OPENCORE_LIBRARY_CONFIG__: LibraryConfigStore | undefined
}

/**
 * Creates a namespaced config accessor for library wrappers.
 */
export function createLibraryConfigAccessor<TConfig = Record<string, unknown>>(
  namespace: string,
): OpenCoreLibraryConfigAccessor<TConfig> {
  return {
    namespace,
    get<TKey extends keyof TConfig>(key: TKey): TConfig[TKey] | undefined {
      const configSource = globalThis.__OPENCORE_LIBRARY_CONFIG__?.[namespace] as
        | Partial<TConfig>
        | undefined
      return configSource?.[key]
    },
  }
}
