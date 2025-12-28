import type { CommandInfo } from '../services/ports/command-execution.port'
import type { GuardOptions } from '../decorators/guard'
import type { ThrottleOptions } from '../decorators/throttle'
import type { StateRequirement } from '../decorators/requiresState'

/**
 * Security metadata collected from decorators for remote validation.
 *
 * @remarks
 * Transmitted from RESOURCE to CORE during command registration.
 * CORE validates these constraints before delegating execution back to RESOURCE.
 */
export interface SecurityMetadata {
  /** @Guard decorator options (rank/permission requirements) */
  guard?: GuardOptions

  /** @Throttle decorator options (rate limiting configuration) */
  throttle?: ThrottleOptions

  /** @RequiresState decorator options (player state validation) */
  requiresState?: StateRequirement
}

/**
 * Metadata sent when a RESOURCE registers a command with CORE.
 */
export interface CommandRegistrationDto {
  /** Command name (without leading slash) */
  command: string
  /** Optional description shown in help */
  description?: string
  /** Optional usage hint (e.g., "/revive <player>") */
  usage?: string
  /** Whether command allows unauthenticated access */
  isPublic: boolean
  /** Resource name that owns this command */
  resourceName: string
  /** Security metadata for CORE validation (optional) */
  security?: SecurityMetadata
}

/**
 * Type-safe interface for CORE resource exports.
 *
 * @remarks
 * Used by remote services (RemoteCommandService, RemotePlayerService, etc.)
 * to access CORE functionality via FiveM exports with full type safety.
 *
 * Usage:
 * ```ts
 * const core = (exports as any)[coreResourceName] as CoreExports
 * core.registerCommand({ ... })
 * ```
 */
export interface CoreExports {
  // ═══════════════════════════════════════════════════════════════
  // Player Exports
  // ═══════════════════════════════════════════════════════════════

  /**
   * Gets persistent account ID for a client.
   *
   * @param clientID - FiveM client/server ID
   * @returns Account ID or undefined if not linked
   */
  getPlayerId(clientID: number): string | undefined

  /**
   * Retrieves session metadata for a player.
   *
   * @param clientID - FiveM client/server ID
   * @param key - Metadata key
   * @returns Stored value or undefined
   */
  getPlayerMeta(clientID: number, key: string): Promise<any>

  /**
   * Stores session metadata for a player.
   *
   * @param clientID - FiveM client/server ID
   * @param key - Metadata key
   * @param value - Value to store
   */
  setPlayerMeta(clientID: number, key: string, value: unknown): void

  // ═══════════════════════════════════════════════════════════════
  // Command Exports
  // ═══════════════════════════════════════════════════════════════

  /**
   * Registers a command from a RESOURCE with CORE.
   *
   * @remarks
   * CORE maintains command registry and routes execution back to the owning resource.
   * Handlers remain in the RESOURCE and are invoked via event when command executes.
   *
   * @param metadata - Command registration metadata
   */
  registerCommand(metadata: CommandRegistrationDto): void

  /**
   * Executes a registered command (called by RESOURCE when delegating).
   *
   * @param clientID - Player client ID
   * @param commandName - Command name (without leading slash)
   * @param args - Raw argument strings
   */
  executeCommand(clientID: number, commandName: string, args: string[]): Promise<void>

  /**
   * Returns all registered commands (local + remote).
   *
   * @returns Array of command metadata
   */
  getAllCommands(): CommandInfo[]
}
