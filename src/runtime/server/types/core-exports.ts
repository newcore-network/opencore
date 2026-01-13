import { Principal } from '../contracts/security/permission.types'
import { GuardOptions } from '../decorators/guard'
import { StateRequirement } from '../decorators/requiresState'
import { ThrottleOptions } from '../decorators/throttle'
import { CommandInfo } from '../services/ports/command-execution.port'

// ═══════════════════════════════════════════════════════════════════════════
// Player Serialization Types
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Serialized player data for cross-resource transfer.
 *
 * @remarks
 * This DTO contains all session data that can be transferred from CORE to RESOURCE.
 * Used by PlayerDirectory exports to provide real player data to remote resources.
 */
export interface SerializedPlayerData {
  /** FiveM server client ID (source) */
  clientID: number

  /** Persistent account ID (undefined if not authenticated) */
  accountID?: string

  /** Platform identifiers (license, steam, discord, etc.) */
  identifiers?: {
    license?: string
    steam?: string
    discord?: string
    [key: string]: string | undefined
  }

  /** Session metadata (transient key-value storage) */
  meta: Record<string, unknown>

  /** Active state flags (dead, cuffed, etc.) */
  states: string[]
}

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
export interface InternalPrincipalExports {
  // ═══════════════════════════════════════════════════════════════
  // Principal/Permission Exports
  // ═══════════════════════════════════════════════════════════════

  /**
   * Gets the full Principal object for a player.
   *
   * @param source - FiveM client/server ID
   * @returns Principal data or null if not authenticated
   */
  getPrincipal(source: number): Promise<Principal | null>

  /**
   * Gets Principal by account ID (works for offline players too).
   *
   * @param accountId - Database account identifier
   * @returns Principal data or null
   */
  getPrincipalByAccountId(accountId: string): Promise<Principal | null>

  /**
   * Forces a refresh of the player's permissions from persistence.
   *
   * @param source - FiveM client/server ID
   */
  refreshPrincipal(source: number): Promise<void>

  /**
   * Checks if player has a specific permission.
   *
   * @param source - FiveM client/server ID
   * @param permission - Permission string to check
   * @returns True if player has permission (or wildcard '*')
   */
  hasPermission(source: number, permission: string): Promise<boolean>

  /**
   * Checks if player has at least the required rank.
   *
   * @param source - FiveM client/server ID
   * @param requiredRank - Minimum rank value
   * @returns True if playerRank >= requiredRank
   */
  hasRank(source: number, requiredRank: number): Promise<boolean>

  /**
   * Checks if player has ANY of the specified permissions.
   *
   * @param source - FiveM client/server ID
   * @param permissions - Array of permissions to check
   * @returns True if player has at least one permission
   */
  hasAnyPermission(source: number, permissions: string[]): Promise<boolean>

  /**
   * Checks if player has ALL of the specified permissions.
   *
   * @param source - FiveM client/server ID
   * @param permissions - Array of permissions to check
   * @returns True if player has all permissions
   */
  hasAllPermissions(source: number, permissions: string[]): Promise<boolean>

  /**
   * Gets all permissions for a player.
   *
   * @param source - FiveM client/server ID
   * @returns Array of permission strings
   */
  getPermissions(source: number): Promise<string[]>

  /**
   * Gets the rank value for a player.
   *
   * @param source - FiveM client/server ID
   * @returns Rank number or null if not set
   */
  getRank(source: number): Promise<number | null>

  /**
   * Gets the principal name/role name for a player.
   *
   * @param source - FiveM client/server ID
   * @returns Role name or null
   */
  getPrincipalName(source: number): Promise<string | null>

  /**
   * Gets principal metadata for a player.
   *
   * @param source - FiveM client/server ID
   * @param key - Metadata key
   * @returns Metadata value or null
   */
  getPrincipalMeta(source: number, key: string): Promise<unknown>

  /**
   * Enforces access control requirements, throwing on failure.
   *
   * @remarks
   * Used by RESOURCE mode to delegate security validation to CORE.
   * Validates rank and/or permission requirements and throws if player
   * doesn't meet the criteria.
   *
   * @param source - FiveM client/server ID
   * @param requirements - Guard options containing rank and/or permission requirements
   *
   * @throws AppError - AUTH:UNAUTHORIZED, GAME:NO_RANK_IN_PRINCIPAL, or AUTH:PERMISSION_DENIED
   */
  enforce(source: number, requirements: GuardOptions): Promise<void>
}

export interface InternalCommandsExports {
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

export interface InternalPlayerExports {
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

  /**
   * Gets complete serialized player data.
   *
   * @param clientID - FiveM client/server ID
   * @returns Serialized player data or null if not found
   */
  getPlayerData(clientID: number): SerializedPlayerData | null

  getManyData(clientIds: number[]): SerializedPlayerData[]

  /**
   * Gets serialized data for all connected players.
   *
   * @returns Array of serialized player data
   */
  getAllPlayersData(): SerializedPlayerData[]

  /**
   * Finds a player by their persistent account ID.
   *
   * @param accountId - Database account identifier
   * @returns Serialized player data or null if not online
   */
  getPlayerByAccountId(accountId: string): SerializedPlayerData | null

  /**
   * Gets the current player count.
   *
   * @returns Number of connected players
   */
  getPlayerCount(): number

  /**
   * Checks if a player with given account ID is online.
   *
   * @param accountId - Database account identifier
   * @returns True if player is connected
   */
  isPlayerOnline(accountId: string): boolean

  /**
   * Gets all active state flags for a player.
   *
   * @param clientID - FiveM client/server ID
   * @returns Array of active state strings
   */
  getPlayerStates(clientID: number): string[]

  /**
   * Checks if player has a specific state.
   *
   * @param clientID - FiveM client/server ID
   * @param state - State identifier to check
   * @returns True if state is active
   */
  hasPlayerState(clientID: number, state: string): boolean

  /**
   * Adds a state flag to a player.
   *
   * @param clientID - FiveM client/server ID
   * @param state - State identifier to add
   */
  addPlayerState(clientID: number, state: string): void

  /**
   * Removes a state flag from a player.
   *
   * @param clientID - FiveM client/server ID
   * @param state - State identifier to remove
   */
  removePlayerState(clientID: number, state: string): void
}
