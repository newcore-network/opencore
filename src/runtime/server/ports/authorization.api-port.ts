import { Principal } from '../types/principal.type'
import { GuardOptions } from '../decorators/guard'
import { Player } from '../entities'

/**
 * Core port that provides access to player authorization and permissions.
 *
 * @remarks
 * This port defines a framework-owned boundary for querying permission-related data
 * regardless of the current runtime mode (CORE, RESOURCE, etc.).
 *
 * Implementations of this port are responsible for resolving permission information
 * from the authoritative source (local provider, remote core exports, etc.).
 *
 * **Mode Differences:**
 * - **CORE/STANDALONE**: Uses the user-provided PrincipalProviderContract directly
 * - **RESOURCE**: Delegates to CORE via exports
 *
 * **Usage:**
 * ```typescript
 * @injectable()
 * class MyService {
 *   constructor(private principal: PrincipalPort) {}
 *
 *   async canBan(player: Player): Promise<boolean> {
 *     return await this.principal.hasPermission(player, 'admin.ban')
 *   }
 * }
 * ```
 */
export abstract class Authorization {
  // ═══════════════════════════════════════════════════════════════
  // Principal Queries
  // ═══════════════════════════════════════════════════════════════

  /**
   * Gets the full Principal object for a player.
   *
   * @param player - The player entity
   * @returns Principal data or null if not authenticated
   */
  abstract getPrincipal(player: Player): Promise<Principal | null>

  /**
   * Gets Principal by account ID (works for offline players too).
   *
   * @param accountId - Account identifier
   * @returns Principal data or null
   */
  abstract getPrincipalByAccountId(accountId: string): Promise<Principal | null>

  /**
   * Forces a refresh of the player's permissions from persistence.
   *
   * @remarks
   * Use this after promoting/demoting a player while they're online.
   *
   * @param player - The player to refresh
   */
  abstract refreshPrincipal(player: Player): Promise<void>

  // ═══════════════════════════════════════════════════════════════
  // Quick Authorization Checks
  // ═══════════════════════════════════════════════════════════════

  /**
   * Checks if player has a specific permission.
   *
   * @remarks
   * Supports wildcard '*' permission for super-admin access.
   *
   * @param player - The player entity
   * @param permission - Permission string to check
   * @returns True if player has permission
   */
  abstract hasPermission(player: Player, permission: string): Promise<boolean>

  /**
   * Checks if player has at least the required rank.
   *
   * @remarks
   * Uses numeric comparison: playerRank >= requiredRank
   *
   * @param player - The player entity
   * @param requiredRank - Minimum rank value
   * @returns True if playerRank >= requiredRank
   */
  abstract hasRank(player: Player, requiredRank: number): Promise<boolean>

  /**
   * Checks if player has ANY of the specified permissions.
   *
   * @param player - The player entity
   * @param permissions - Array of permissions to check
   * @returns True if player has at least one permission
   */
  abstract hasAnyPermission(player: Player, permissions: string[]): Promise<boolean>

  /**
   * Checks if player has ALL of the specified permissions.
   *
   * @param player - The player entity
   * @param permissions - Array of permissions to check
   * @returns True if player has all permissions
   */
  abstract hasAllPermissions(player: Player, permissions: string[]): Promise<boolean>

  // ═══════════════════════════════════════════════════════════════
  // Property Getters
  // ═══════════════════════════════════════════════════════════════

  /**
   * Gets all permissions for a player.
   *
   * @param player - The player entity
   * @returns Array of permission strings
   */
  abstract getPermissions(player: Player): Promise<string[]>

  /**
   * Gets the rank value for a player.
   *
   * @param player - The player entity
   * @returns Rank number or null if not set
   */
  abstract getRank(player: Player): Promise<number | null>

  /**
   * Gets the principal name/role name for a player.
   *
   * @param player - The player entity
   * @returns Role name or null
   */
  abstract getPrincipalName(player: Player): Promise<string | null>

  /**
   * Gets principal metadata for a player.
   *
   * @param player - The player entity
   * @param key - Metadata key
   * @returns Metadata value or null
   */
  abstract getPrincipalMeta(player: Player, key: string): Promise<unknown>

  // ═══════════════════════════════════════════════════════════════
  // Access Control Enforcement
  // ═══════════════════════════════════════════════════════════════

  /**
   * Enforces access control requirements, throwing on failure.
   *
   * @remarks
   * This is the primary method used by `@Guard` decorator and security validation.
   * It validates rank and/or permission requirements and throws `AppError` if
   * the player doesn't meet the criteria.
   *
   * **Validation Order:**
   * 1. Rank check (if `rank` specified)
   * 2. Permission check (if `permission` specified)
   *
   * @param player - The player entity to validate
   * @param requirements - Guard options containing rank and/or permission requirements
   *
   * @throws AppError - `AUTH:UNAUTHORIZED` if player has no principal
   * @throws AppError - `GAME:NO_RANK_IN_PRINCIPAL` if rank check requested but principal has no rank
   * @throws AppError - `AUTH:PERMISSION_DENIED` if player doesn't meet requirements
   *
   * @example
   * ```typescript
   * // In a service or controller
   * await this.principal.enforce(player, { rank: 5 })
   * await this.principal.enforce(player, { permission: 'admin.ban' })
   * await this.principal.enforce(player, { rank: 3, permission: 'mod.kick' })
   * ```
   */
  abstract enforce(player: Player, requirements: GuardOptions): Promise<void>
}
