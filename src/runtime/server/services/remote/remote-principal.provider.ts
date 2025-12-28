import { injectable } from 'tsyringe'
import { Player } from '../../entities'
import { getRuntimeContext } from '../../runtime'
import { Principal, PrincipalProviderContract } from '../../contracts'

/**
 * Principal provider implementation for `RESOURCE` mode.
 *
 * @remarks
 * This provider delegates principal resolution to the core resource via exports.
 */
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
