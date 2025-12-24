import { injectable } from 'tsyringe'

import { AppError } from '../../../kernel/utils'
import { Server } from '../../..'
import { PrincipalProviderContract } from '../templates'

/**
 * **Core Security Service**
 *
 * This service acts as the central enforcement point for the Access Control system.
 * It uses the configured `PrincipalProvider` to query roles and validates them against requirements.
 *
 * It is primarily used internally by the `@Guard` decorator, but can be injected
 * into services to perform manual checks.
 */
@injectable()
export class AccessControlService {
  constructor(private readonly principalProvider: PrincipalProviderContract) {}

  /**
   * Verifies if a player meets a minimum numeric rank requirement.
   *
   * @param player - The target player.
   * @param minRank - The minimum numeric value required (Inclusive).
   *
   * @returns `true` if `Principal.rank >= minRank`.
   *
   * @throws {AppError} code `UNAUTHORIZED` if the player has no Principal (not logged in).
   * @throws {AppError} code `NO_RANK_IN_PRINCIPAL` if the Principal exists but has no `rank` defined.
   */
  async hasRank(player: Server.Player, minRank: number): Promise<boolean> {
    const principal = await this.principalProvider.getPrincipal(player)
    if (!principal) throw new AppError('AUTH:UNAUTHORIZED', 'No principal found', 'core')
    if (principal.rank === undefined)
      throw new AppError(
        'GAME:NO_RANK_IN_PRINCIPAL',
        "You're trying to compare a Principal rank, but there's no defined rank! ",
        'core',
      )
    return principal.rank! >= minRank
  }

  /**
   * Verifies if a player possesses a specific permission string.
   *
   * @remarks
   * This method supports the **Wildcard ('*')** permission. If the principal has `'*'`
   * in their permissions array, this method always returns `true`.
   *
   * @param player - The target player.
   * @param permission - The specific permission key (e.g., `'admin.ban'`).
   * @returns `true` if the player has the permission or the wildcard.
   */
  async hasPermission(player: Server.Player, permission: string): Promise<boolean> {
    const principal = await this.principalProvider.getPrincipal(player)
    if (!principal) return false
    if (principal.permissions.includes('*')) return true
    return principal.permissions.includes(permission)
  }

  /**
   * **Strict Enforcement**
   *
   * Validates a set of requirements against a player. If any requirement fails,
   * it throws an exception, halting the execution flow.
   *
   * Used primarily by the `@Guard` decorator logic.
   *
   * @param player - The server player to validate.
   * @param requirements - An object containing rank and/or permission constraints.
   *
   * @throws {AppError} code `PERMISSION_DENIED` if validation fails.
   */
  async enforce(
    player: Server.Player,
    requirements: { minRank?: number; permission?: string },
  ): Promise<void> {
    if (requirements.minRank !== undefined) {
      const hasRank = await this.hasRank(player, requirements.minRank)
      if (!hasRank) {
        throw new AppError(
          'AUTH:PERMISSION_DENIED',
          `Access Denied: Requires minimum rank level ${requirements.minRank}`,
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
