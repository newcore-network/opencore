import { initClientCore } from './client-bootstrap'
import { installClientAdapter } from './adapter/registry'
import { ClientInitOptions } from './client-runtime'
import { installClientPlugins } from './library/plugin/install-client-plugins'

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
  await installClientAdapter(options.adapter)
  await installClientPlugins(options.plugins ?? [], options)
  await initClientCore(options)
}
