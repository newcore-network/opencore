import { injectable } from 'tsyringe'
import type { PrincipalProvider } from './principal-provider'
import { PermissionKey } from './permission.types'
import { AppError } from 'utils'

/**
 * Centralized access control helper.
 * It doesn't know how roles are stored, only how to query them
 * via PrincipalProvider.
 */
@injectable()
export class AccessControlService {
  constructor(private readonly principalProvider: PrincipalProvider) {}

  /**
   * Checks if the given client has a specific permission.
   */
  async hasPermission(clientID: number, permission: PermissionKey): Promise<boolean> {
    const role = await this.principalProvider.getRoleForClient(clientID)
    if (!role) return false
    return role.permissions.includes(permission)
  }

  /**
   * Throws an error if the client does not have the required permission.
   * Controllers/services can use this to enforce security.
   */
  async requirePermission(clientID: number, permission: PermissionKey): Promise<void> {
    const has = await this.hasPermission(clientID, permission)
    if (!has) {
      throw new AppError('PERMISSION_DENIED', `Missing permission: ${permission}`, 'core', {
        clientID,
        permission,
      })
    }
  }

  /**
   * Checks if the client has at least one permission in the list.
   */
  async hasAny(clientID: number, permissions: PermissionKey[]): Promise<boolean> {
    const role = await this.principalProvider.getRoleForClient(clientID)
    if (!role) return false
    return permissions.some((perm) => role.permissions.includes(perm))
  }
}
