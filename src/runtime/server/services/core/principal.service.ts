import { injectable } from 'tsyringe'
import { AppError } from '../../../../kernel/utils'
import type { PrincipalProviderContract } from '../../contracts'
import type { Principal } from '../../contracts/security/permission.types'
import type { GuardOptions } from '../../decorators/guard'
import type { Player } from '../../entities'
import { PrincipalPort } from '../ports/principal.port'

/**
 * Local principal service for CORE/STANDALONE mode.
 *
 * @remarks
 * This service wraps the user-provided PrincipalProviderContract and provides
 * convenience methods for permission checking. All operations are performed locally.
 */
@injectable()
export class LocalPrincipalService extends PrincipalPort {
  constructor(private readonly provider: PrincipalProviderContract) {
    super()
  }

  // ═══════════════════════════════════════════════════════════════
  // Principal Queries
  // ═══════════════════════════════════════════════════════════════

  async getPrincipal(player: Player): Promise<Principal | null> {
    return await this.provider.getPrincipal(player)
  }

  async getPrincipalByAccountId(accountId: string): Promise<Principal | null> {
    return await this.provider.getPrincipalByLinkedID(accountId)
  }

  async refreshPrincipal(player: Player): Promise<void> {
    await this.provider.refreshPrincipal(player)
  }

  // ═══════════════════════════════════════════════════════════════
  // Quick Authorization Checks
  // ═══════════════════════════════════════════════════════════════

  async hasPermission(player: Player, permission: string): Promise<boolean> {
    const principal = await this.provider.getPrincipal(player)
    if (!principal) return false

    // Check for wildcard (super-admin) or specific permission
    return principal.permissions.includes('*') || principal.permissions.includes(permission)
  }

  async hasRank(player: Player, requiredRank: number): Promise<boolean> {
    const principal = await this.provider.getPrincipal(player)
    if (!principal || principal.rank === undefined) return false

    return principal.rank >= requiredRank
  }

  async hasAnyPermission(player: Player, permissions: string[]): Promise<boolean> {
    const principal = await this.provider.getPrincipal(player)
    if (!principal) return false

    // Wildcard grants all permissions
    if (principal.permissions.includes('*')) return true

    return permissions.some((perm) => principal.permissions.includes(perm))
  }

  async hasAllPermissions(player: Player, permissions: string[]): Promise<boolean> {
    const principal = await this.provider.getPrincipal(player)
    if (!principal) return false

    // Wildcard grants all permissions
    if (principal.permissions.includes('*')) return true

    return permissions.every((perm) => principal.permissions.includes(perm))
  }

  // ═══════════════════════════════════════════════════════════════
  // Property Getters
  // ═══════════════════════════════════════════════════════════════

  async getPermissions(player: Player): Promise<string[]> {
    const principal = await this.provider.getPrincipal(player)
    return principal?.permissions ?? []
  }

  async getRank(player: Player): Promise<number | null> {
    const principal = await this.provider.getPrincipal(player)
    return principal?.rank ?? null
  }

  async getPrincipalName(player: Player): Promise<string | null> {
    const principal = await this.provider.getPrincipal(player)
    return principal?.name ?? null
  }

  async getPrincipalMeta(player: Player, key: string): Promise<unknown> {
    const principal = await this.provider.getPrincipal(player)
    return principal?.meta?.[key] ?? null
  }

  // ═══════════════════════════════════════════════════════════════
  // Access Control Enforcement
  // ═══════════════════════════════════════════════════════════════

  async enforce(player: Player, requirements: GuardOptions): Promise<void> {
    if (requirements.rank !== undefined) {
      const principal = await this.provider.getPrincipal(player)
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
      const hasPerm = await this.hasPermission(player, requirements.permission)
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
