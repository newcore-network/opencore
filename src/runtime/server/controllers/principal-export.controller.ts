import { inject } from 'tsyringe'
import { AppError } from '../../../kernel/error/app.error'
import { Principal, PrincipalProviderContract } from '../contracts/index'
import { Export } from '../decorators/export'
import { GuardOptions } from '../decorators/guard'
import { Controller } from '../decorators/index'
import { Players } from '../ports/players.api-port'

/**
 * Exports principal/permission functionality for RESOURCE mode access.
 *
 * @remarks
 * This controller provides a complete API for remote resources to:
 * - Query player permissions and ranks
 * - Perform quick authorization checks
 * - Refresh cached permissions
 * - Query offline player permissions by account ID
 */
@Controller()
export class PrincipalExportController {
  constructor(
    @inject(Players as any)
    private readonly playerService: Players,
    @inject(PrincipalProviderContract as any)
    private readonly principalProvider: PrincipalProviderContract,
  ) {}

  // ═══════════════════════════════════════════════════════════════
  // Principal Queries
  // ═══════════════════════════════════════════════════════════════

  /**
   * Gets the full Principal object for a player.
   */
  @Export()
  async getPrincipal(source: number): Promise<Principal | null> {
    const player = this.playerService.getByClient(source)
    if (!player) return null
    return await this.principalProvider.getPrincipal(player)
  }

  /**
   * Gets Principal by account ID (works for offline players too).
   */
  @Export()
  async getPrincipalByAccountId(accountId: string): Promise<Principal | null> {
    return await this.principalProvider.getPrincipalByLinkedID(accountId)
  }

  /**
   * Forces a refresh of the player's permissions from persistence.
   */
  @Export()
  async refreshPrincipal(source: number): Promise<void> {
    const player = this.playerService.getByClient(source)
    if (!player) return
    await this.principalProvider.refreshPrincipal(player)
  }

  // ═══════════════════════════════════════════════════════════════
  // Quick Authorization Checks
  // ═══════════════════════════════════════════════════════════════

  /**
   * Checks if player has a specific permission.
   *
   * @remarks
   * Supports wildcard '*' permission for super-admin access.
   */
  @Export()
  async hasPermission(source: number, permission: string): Promise<boolean> {
    const player = this.playerService.getByClient(source)
    if (!player) return false

    const principal = await this.principalProvider.getPrincipal(player)
    if (!principal) return false

    // Check for wildcard (super-admin) or specific permission
    return principal.permissions.includes('*') || principal.permissions.includes(permission)
  }

  /**
   * Checks if player has at least the required rank.
   *
   * @remarks
   * Uses numeric comparison: playerRank >= requiredRank
   */
  @Export()
  async hasRank(source: number, requiredRank: number): Promise<boolean> {
    const player = this.playerService.getByClient(source)
    if (!player) return false

    const principal = await this.principalProvider.getPrincipal(player)
    if (!principal || principal.rank === undefined) return false

    return principal.rank >= requiredRank
  }

  /**
   * Checks if player has ANY of the specified permissions.
   */
  @Export()
  async hasAnyPermission(source: number, permissions: string[]): Promise<boolean> {
    const player = this.playerService.getByClient(source)
    if (!player) return false

    const principal = await this.principalProvider.getPrincipal(player)
    if (!principal) return false

    // Wildcard grants all permissions
    if (principal.permissions.includes('*')) return true

    return permissions.some((perm) => principal.permissions.includes(perm))
  }

  /**
   * Checks if player has ALL of the specified permissions.
   */
  @Export()
  async hasAllPermissions(source: number, permissions: string[]): Promise<boolean> {
    const player = this.playerService.getByClient(source)
    if (!player) return false

    const principal = await this.principalProvider.getPrincipal(player)
    if (!principal) return false

    // Wildcard grants all permissions
    if (principal.permissions.includes('*')) return true

    return permissions.every((perm) => principal.permissions.includes(perm))
  }

  // ═══════════════════════════════════════════════════════════════
  // Property Getters
  // ═══════════════════════════════════════════════════════════════

  /**
   * Gets all permissions for a player.
   */
  @Export()
  async getPermissions(source: number): Promise<string[]> {
    const player = this.playerService.getByClient(source)
    if (!player) return []

    const principal = await this.principalProvider.getPrincipal(player)
    return principal?.permissions ?? []
  }

  /**
   * Gets the rank value for a player.
   */
  @Export()
  async getRank(source: number): Promise<number | null> {
    const player = this.playerService.getByClient(source)
    if (!player) return null

    const principal = await this.principalProvider.getPrincipal(player)
    return principal?.rank ?? null
  }

  /**
   * Gets the principal name/role name for a player.
   */
  @Export()
  async getPrincipalName(source: number): Promise<string | null> {
    const player = this.playerService.getByClient(source)
    if (!player) return null

    const principal = await this.principalProvider.getPrincipal(player)
    return principal?.name ?? null
  }

  /**
   * Gets principal metadata for a player.
   */
  @Export()
  async getPrincipalMeta(source: number, key: string): Promise<unknown> {
    const player = this.playerService.getByClient(source)
    if (!player) return null

    const principal = await this.principalProvider.getPrincipal(player)
    return principal?.meta?.[key] ?? null
  }

  // ═══════════════════════════════════════════════════════════════
  // Access Control Enforcement
  // ═══════════════════════════════════════════════════════════════

  /**
   * Enforces access control requirements, throwing on failure.
   *
   * @remarks
   * Used by RESOURCE mode to delegate security validation to CORE.
   * Validates rank and/or permission requirements and throws if player
   * doesn't meet the criteria.
   *
   * @throws AppError - AUTH:UNAUTHORIZED, GAME:NO_RANK_IN_PRINCIPAL, or AUTH:PERMISSION_DENIED
   */
  @Export()
  async enforce(source: number, requirements: GuardOptions): Promise<void> {
    const player = this.playerService.getByClient(source)
    if (!player) {
      throw new AppError('GAME:PLAYER_NOT_FOUND', `Player not found: ${source}`, 'core')
    }

    if (requirements.rank !== undefined) {
      const principal = await this.principalProvider.getPrincipal(player)
      if (!principal) {
        throw new AppError('AUTH:UNAUTHORIZED', 'No principal found', 'core')
      }
      if (principal.rank === undefined) {
        throw new AppError(
          'GAME:NO_RANK_IN_PRINCIPAL',
          "You're trying to compare a Principal rank, but there's no defined rank!",
          'core',
        )
      }
      if (principal.rank < requirements.rank) {
        throw new AppError(
          'AUTH:PERMISSION_DENIED',
          `Access Denied: Requires minimum rank level ${requirements.rank}`,
          'core',
        )
      }
    }

    if (requirements.permission) {
      const principal = await this.principalProvider.getPrincipal(player)
      if (!principal) {
        throw new AppError(
          'AUTH:PERMISSION_DENIED',
          `Access Denied: Missing required permission '${requirements.permission}'`,
          'core',
        )
      }

      const hasPerm =
        principal.permissions.includes('*') ||
        principal.permissions.includes(requirements.permission)
      if (!hasPerm) {
        throw new AppError(
          'AUTH:PERMISSION_DENIED',
          `Access Denied: Missing required permission '${requirements.permission}'`,
          'core',
        )
      }
    }
  }
}
