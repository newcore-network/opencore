import type { OpenCoreClientPlugin } from './library/plugin'

/**
 * Client Runtime Configuration
 *
 * Defines initialization modes and configuration for the client-side framework.
 */

export type ClientMode = 'CORE' | 'RESOURCE' | 'STANDALONE'

/**
 * Client initialization options
 *
 * @remarks
 * - **CORE**: Initializes all framework services (SpawnService, NotificationService, etc.)
 *   and scans controllers. Should only be used by the main core resource.
 *
 * - **RESOURCE**: Only scans controllers from this resource. Does NOT initialize services.
 *   Used when a resource extends the core with additional functionality.
 *
 * - **STANDALONE**: Same as RESOURCE - only scans controllers. Services must be registered
 *   manually if needed. Use for independent resources or testing.
 *
 * @example
 * ```ts
 * // Core resource
 * await Client.init({ mode: 'CORE' })
 *
 * // Chat resource (extends core)
 * await Client.init({ mode: 'RESOURCE' })
 * ```
 */
export interface ClientInitOptions {
  /**
   * The client initialization mode.
   *
   * Defaults to 'CORE' if not specified (for backwards compatibility).
   */
  mode?: ClientMode

  /**
   * Optional client plugins installed before bootstrap.
   */
  plugins?: OpenCoreClientPlugin[]
}

/**
 * Client runtime context
 */
export interface ClientRuntimeContext {
  mode: ClientMode
  resourceName: string
  isInitialized: boolean
}

let runtimeContext: ClientRuntimeContext | null = null

/**
 * Get the current client runtime context
 */
export function getClientRuntimeContext(): ClientRuntimeContext | null {
  return runtimeContext
}

/**
 * Set the client runtime context
 *
 * @internal
 */
export function setClientRuntimeContext(ctx: ClientRuntimeContext): void {
  runtimeContext = ctx
}

/**
 * Check if the client has been initialized
 */
export function isClientInitialized(): boolean {
  return runtimeContext?.isInitialized ?? false
}
