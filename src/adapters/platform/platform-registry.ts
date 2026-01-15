import type { DependencyContainer } from 'tsyringe'

/**
 * Platform adapter interface for registering platform-specific implementations.
 *
 * @remarks
 * Each supported platform (FiveM, RageMP, alt:V, etc.) should implement this
 * interface to provide automatic detection and dependency registration.
 */
export interface PlatformAdapter {
  /**
   * Unique platform identifier.
   * @example 'fivem', 'ragemp', 'altv', 'node'
   */
  readonly name: string

  /**
   * Priority for platform detection (higher = checked first).
   * Useful when multiple platforms might match.
   * @default 0
   */
  readonly priority?: number

  /**
   * Detect if the current runtime is this platform.
   * @returns true if running on this platform
   */
  detect(): boolean

  /**
   * Register all platform-specific adapters in the DI container.
   * @param container - The dependency injection container
   */
  register(container: DependencyContainer): Promise<void>
}

/**
 * Registry for platform adapters.
 * Allows dynamic registration and detection of platforms.
 */
class PlatformRegistry {
  private adapters: PlatformAdapter[] = []
  private currentPlatform: PlatformAdapter | null = null

  /**
   * Register a platform adapter.
   * @param adapter - Platform adapter to register
   */
  register(adapter: PlatformAdapter): void {
    // Avoid duplicates
    if (this.adapters.some((a) => a.name === adapter.name)) {
      return
    }
    this.adapters.push(adapter)
    // Sort by priority (descending)
    this.adapters.sort((a, b) => (b.priority ?? 0) - (a.priority ?? 0))
  }

  /**
   * Unregister a platform adapter.
   * @param name - Platform name to unregister
   */
  unregister(name: string): void {
    this.adapters = this.adapters.filter((a) => a.name !== name)
  }

  /**
   * Get all registered platform adapters.
   */
  getAll(): readonly PlatformAdapter[] {
    return this.adapters
  }

  /**
   * Get a specific platform adapter by name.
   * @param name - Platform name
   */
  get(name: string): PlatformAdapter | undefined {
    return this.adapters.find((a) => a.name === name)
  }

  /**
   * Detect the current platform from registered adapters.
   * @returns The detected platform adapter or undefined
   */
  detect(): PlatformAdapter | undefined {
    return this.adapters.find((adapter) => adapter.detect())
  }

  /**
   * Detect and register platform capabilities in the container.
   *
   * @param container - DI container to register adapters in
   * @param forcePlatform - Optional platform name to force (skip detection)
   * @returns The registered platform adapter
   * @throws Error if no platform is detected
   */
  async detectAndRegister(
    container: DependencyContainer,
    forcePlatform?: string,
  ): Promise<PlatformAdapter> {
    let platform: PlatformAdapter | undefined

    if (forcePlatform) {
      platform = this.get(forcePlatform)
      if (!platform) {
        throw new Error(
          `[OpenCore] Platform '${forcePlatform}' not found. Available: ${this.adapters.map((a) => a.name).join(', ')}`,
        )
      }
    } else {
      platform = this.detect()
      if (!platform) {
        throw new Error(
          `[OpenCore] No platform detected. Registered platforms: ${this.adapters.map((a) => a.name).join(', ')}`,
        )
      }
    }

    await platform.register(container)
    this.currentPlatform = platform
    return platform
  }

  /**
   * Get the currently active platform.
   * Only available after detectAndRegister has been called.
   */
  getCurrent(): PlatformAdapter | null {
    return this.currentPlatform
  }

  /**
   * Check if a specific platform is currently active.
   * @param name - Platform name to check
   */
  isCurrentPlatform(name: string): boolean {
    return this.currentPlatform?.name === name
  }

  /**
   * Clear all registered adapters (mainly for testing).
   */
  clear(): void {
    this.adapters = []
    this.currentPlatform = null
  }
}

/**
 * Global platform registry instance.
 */
export const platformRegistry = new PlatformRegistry()

/**
 * Convenience function to register a platform adapter.
 * @param adapter - Platform adapter to register
 */
export function registerPlatform(adapter: PlatformAdapter): void {
  platformRegistry.register(adapter)
}

/**
 * Get the current platform name.
 * @returns Platform name or 'unknown' if not detected
 */
export function getCurrentPlatformName(): string {
  return platformRegistry.getCurrent()?.name ?? 'unknown'
}
