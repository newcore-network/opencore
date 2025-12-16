import { injectable } from 'tsyringe'
import { PrincipalProviderContract, Principal } from '../../templates'
import { Player } from '../../entities'
import { getRuntimeContext } from '../../runtime'

@injectable()
export class RemotePrincipalProvider extends PrincipalProviderContract {
  private get core() {
    const { coreResourceName } = getRuntimeContext()
    return (exports as any)[coreResourceName]
  }

  async getPrincipal(player: Player): Promise<Principal | null> {
    return this.core.getPrincipal(player.clientID)
  }
  /** Not working */
  async refreshPrincipal() {}
  /** Not working */
  async getPrincipalByLinkedID() {
    return null
  }
}
