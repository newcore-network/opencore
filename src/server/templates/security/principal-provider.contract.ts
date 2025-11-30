import type { Server } from '../../..'
import type { RoleLike } from './permission.types'

/**
 * Abstraction used by the security layer to obtain the role/permissions
 * for a given clientID.
 *
 * Implemented by modules (e.g. account module) and wired via DI.
 */
export abstract class PrincipalProviderContract {
  abstract getRoleByPlayer(player: Server.Player): Promise<RoleLike | null>
}
