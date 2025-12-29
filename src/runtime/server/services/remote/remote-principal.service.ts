import { inject, injectable } from 'tsyringe'
import { IExports } from '../../../../adapters'
import type { Principal } from '../../contracts/security/permission.types'
import type { GuardOptions } from '../../decorators/guard'
import type { Player } from '../../entities'
import { getRuntimeContext } from '../../runtime'
import type { CorePrincipalExports } from '../../types/core-exports'
import { PrincipalPort } from '../ports/principal.port'

/**
 * Principal service implementation for `RESOURCE` mode.
 *
 * @remarks
 * This service delegates all principal/permission operations to CORE via exports.
 * It provides the full PrincipalPort interface for RESOURCE mode, allowing
 * transparent usage regardless of whether running in CORE or RESOURCE mode.
 */
@injectable()
export class RemotePrincipalService extends PrincipalPort {
  constructor(@inject(IExports as any) private readonly exportsService: IExports) {
    super()
  }

  /**
   * Gets typed access to CORE resource exports.
   */
  private get core(): CorePrincipalExports {
    const { coreResourceName } = getRuntimeContext()
    const coreExports = this.exportsService.getResource<CorePrincipalExports>(coreResourceName)

    if (!coreExports) {
      throw new Error(
        `[OpenCore] CORE resource '${coreResourceName}' exports not found. ` +
          `Ensure the CORE resource is started BEFORE RESOURCE mode resources.`,
      )
    }

    return coreExports
  }

  // ═══════════════════════════════════════════════════════════════
  // Principal Queries
  // ═══════════════════════════════════════════════════════════════

  async getPrincipal(player: Player): Promise<Principal | null> {
    return await this.core.getPrincipal(player.clientID)
  }

  async getPrincipalByAccountId(accountId: string): Promise<Principal | null> {
    return await this.core.getPrincipalByAccountId(accountId)
  }

  async refreshPrincipal(player: Player): Promise<void> {
    await this.core.refreshPrincipal(player.clientID)
  }

  // ═══════════════════════════════════════════════════════════════
  // Quick Authorization Checks
  // ═══════════════════════════════════════════════════════════════

  async hasPermission(player: Player, permission: string): Promise<boolean> {
    return await this.core.hasPermission(player.clientID, permission)
  }

  async hasRank(player: Player, requiredRank: number): Promise<boolean> {
    return await this.core.hasRank(player.clientID, requiredRank)
  }

  async hasAnyPermission(player: Player, permissions: string[]): Promise<boolean> {
    return await this.core.hasAnyPermission(player.clientID, permissions)
  }

  async hasAllPermissions(player: Player, permissions: string[]): Promise<boolean> {
    return await this.core.hasAllPermissions(player.clientID, permissions)
  }

  // ═══════════════════════════════════════════════════════════════
  // Property Getters
  // ═══════════════════════════════════════════════════════════════

  async getPermissions(player: Player): Promise<string[]> {
    return await this.core.getPermissions(player.clientID)
  }

  async getRank(player: Player): Promise<number | null> {
    return await this.core.getRank(player.clientID)
  }

  async getPrincipalName(player: Player): Promise<string | null> {
    return await this.core.getPrincipalName(player.clientID)
  }

  async getPrincipalMeta(player: Player, key: string): Promise<unknown> {
    return await this.core.getPrincipalMeta(player.clientID, key)
  }

  // ═══════════════════════════════════════════════════════════════
  // Access Control Enforcement
  // ═══════════════════════════════════════════════════════════════

  async enforce(player: Player, requirements: GuardOptions): Promise<void> {
    await this.core.enforce(player.clientID, requirements)
  }
}
