import { initClientCore } from './client-bootstrap'
import type { OpenCoreClientAdapter } from './adapter'
import { installClientAdapter } from './adapter/registry'
import { ClientInitOptions } from './client-runtime'
import { installClientPlugins } from './library/plugin/install-client-plugins'

let pendingAdapter: OpenCoreClientAdapter | undefined

export function useAdapter(adapter: OpenCoreClientAdapter): void {
  pendingAdapter = adapter
}

/**
 * Initialize the OpenCore client framework
 *
 * @param options - Client initialization options
 *
 * @example
 * ```ts
 * // Core resource (initializes all services)
 * await Client.init({ mode: 'CORE' })
 *
 * // Resource mode (only registers controllers)
 * await Client.init({ mode: 'RESOURCE' })
 *
 * // Standalone mode (only registers controllers)
 * await Client.init({ mode: 'STANDALONE' })
 * ```
 */
export async function init(options: ClientInitOptions = {}) {
  if (!options.adapter && pendingAdapter) {
    options = { ...options, adapter: pendingAdapter }
  }

  await installClientAdapter(options.adapter)
  await installClientPlugins(options.plugins ?? [], options)
  await initClientCore(options)
}
