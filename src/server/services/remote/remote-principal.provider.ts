import { injectable } from 'tsyringe'
import { PrincipalProviderContract, Principal } from '../../templates'
import { Player } from '../../entities'

@injectable()
export class RemotePrincipalProvider extends PrincipalProviderContract {
  async getPrincipal(player: Player): Promise<Principal | null> {
    return exports.core.getPrincipal(player.clientID)
  }
  /** Not working */
  async refreshPrincipal() {}
  /** Not working */
  async getPrincipalByLinkedID() {
    return null
  }
}
