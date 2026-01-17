import { GLOBAL_CONTAINER } from '../kernel/di/container'
import { FiveMPlatform } from './fivem/fivem-platform'
import { NodePlatform } from './node/node-platform'
import {
  getCurrentPlatformName,
  type PlatformAdapter,
  platformRegistry,
  registerPlatform,
} from './platform/platform-registry'

// Re-export for convenience
export { platformRegistry, registerPlatform, getCurrentPlatformName }
export type { PlatformAdapter }

/**
 * Supported platform types.
 * @deprecated Use platformRegistry.getCurrent()?.name instead for dynamic platform detection.
 */
export type Platform = 'fivem' | 'node' | string

// ─────────────────────────────────────────────────────────────────
// Register built-in platforms
// ─────────────────────────────────────────────────────────────────

// Register FiveM platform (high priority)
registerPlatform(FiveMPlatform)

// Register Node.js fallback platform (low priority)
registerPlatform(NodePlatform)

// ─────────────────────────────────────────────────────────────────
// Public API
// ─────────────────────────────────────────────────────────────────

/**
 * Detects the current runtime platform.
 *
 * @deprecated Use platformRegistry.detect() instead.
 */
export function detectPlatform(): Platform {
  const detected = platformRegistry.detect()
  return detected?.name ?? 'node'
}

/**
 * Registers server-side platform-specific capability implementations.
 *
 * @remarks
 * This function registers adapters needed by the SERVER runtime only.
 * Client-side adapters are registered separately via `registerClientCapabilities`.
 *
 * The function uses the Platform Registry to automatically detect and register
 * the appropriate platform adapters. You can also force a specific platform
 * by passing its name.
 *
 * @param platform - Optional platform name to force. If not provided, platform is auto-detected.
 *
 * @example
 * ```typescript
 * // Auto-detect platform
 * await registerServerCapabilities()
 *
 * // Force a specific platform
 * await registerServerCapabilities('fivem')
 *
 * // Register a custom platform before calling
 * registerPlatform(MyCustomPlatform)
 * await registerServerCapabilities('myplatform')
 * ```
 */
export async function registerServerCapabilities(platform?: Platform): Promise<void> {
  await platformRegistry.detectAndRegister(GLOBAL_CONTAINER, platform)
}

/**
 * Check if a specific platform is currently active.
 *
 * @param name - Platform name to check
 * @returns true if the platform is active
 *
 * @example
 * ```typescript
 * if (isPlatform('fivem')) {
 *   // FiveM-specific code
 * }
 * ```
 */
export function isPlatform(name: string): boolean {
  return platformRegistry.isCurrentPlatform(name)
}

/**
 * Get the current platform adapter.
 *
 * @returns The current platform adapter or null if not initialized
 */
export function getCurrentPlatform(): PlatformAdapter | null {
  return platformRegistry.getCurrent()
}
