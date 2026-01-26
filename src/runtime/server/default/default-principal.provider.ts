import { injectable } from 'tsyringe'
import { Server } from '../services'
import { PrincipalType } from '../types/principal.type'
import { PrincipalProviderContract } from '../contracts/security/principal-provider.contract'
import { LinkedID } from '../types/linked-id'

/**
 * Default principal provider that grants no permissions.
 * Used when no custom principal provider is configured.
 */
@injectable()
export class DefaultPrincipalProvider extends PrincipalProviderContract {
  async getPrincipal(player: Server.Player): Promise<PrincipalType | null> {
    return {
      id: player.accountID || player.clientID.toString(),
      permissions: [],
      rank: 0,
    }
  }

  async refreshPrincipal(_player: Server.Player): Promise<void> {
    // No-op
  }

  async getPrincipalByLinkedID(linkedID: LinkedID): Promise<PrincipalType | null> {
    return {
      id: String(linkedID),
      permissions: [],
      rank: 0,
    }
  }
}
