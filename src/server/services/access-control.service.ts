import { injectable } from 'tsyringe'

import { AppError } from '../../utils'
import { Server } from '../..'
import { PermissionKey, PrincipalProviderContract } from '../templates'

/**
 * Centralized access control helper.
 * It doesn't know how roles are stored, only how to query them
 * via PrincipalProvider.
 */
@injectable()
export class AccessControlService {
  constructor(private readonly principalProvider: PrincipalProviderContract) {}

  /**
   * Checks if the given client has a specific permission.
   */
  async hasPermission(player: Server.Player, permission: PermissionKey): Promise<boolean> {
    const role = await this.principalProvider.getRoleByPlayer(player)
    if (!role) return false
    return role.permissions.includes(permission)
  }

  /**
   * Throws an error if the client does not have the required permission.
   * Controllers/services can use this to enforce security.
   */
  async requirePermission(player: Server.Player, permission: PermissionKey): Promise<void> {
    const has = await this.hasPermission(player, permission)
    if (!has) {
      throw new AppError('PERMISSION_DENIED', `Missing permission: ${permission}`, 'core', {
        player,
        permission,
      })
    }
  }

  /**
   * Checks if the client has at least one permission in the list.
   */
  async hasAny(player: Server.Player, permissions: PermissionKey[]): Promise<boolean> {
    const role = await this.principalProvider.getRoleByPlayer(player)
    if (!role) return false
    return permissions.some((perm) => role.permissions.includes(perm))
  }
}
