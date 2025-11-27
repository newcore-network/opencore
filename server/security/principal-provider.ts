import { RoleLike } from './permission.types';

/**
 * Abstraction used by the security layer to obtain the role/permissions
 * for a given clientID.
 *
 * Implemented by modules (e.g. account module) and wired via DI.
 */
export interface PrincipalProvider {
  getRoleForClient(clientID: number): Promise<RoleLike | null>;
}
