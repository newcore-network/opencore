import { initClientCore } from './client-bootstrap'
import { ClientInitOptions } from './client-runtime'

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
  await initClientCore(options)
}
