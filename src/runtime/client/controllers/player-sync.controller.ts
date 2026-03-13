import { inject, injectable } from 'tsyringe'
import { IClientPlatformBridge } from '../adapter/platform-bridge'
import { Controller } from '../decorators'

/**
 * Client-side service that syncs player health and armor from server state bags.
 *
 * @remarks
 * Listens to state bag changes from the server and applies them to the local player ped.
 * This allows the server to control player health and armor through simple state bag updates.
 */
@Controller()
@injectable()
export class PlayerSyncController {
  constructor(
    @inject(IClientPlatformBridge as any) private readonly platform: IClientPlatformBridge,
  ) {
    this.registerStateBagHandlers()
  }

  private registerStateBagHandlers(): void {
    this.platform.onLocalPlayerStateChange('health', (value) => {
      const entity = this.platform.getLocalPlayerPed()
      if (typeof value !== 'number' || entity === 0) return
      this.platform.setEntityHealth(entity, value)
    })

    this.platform.onLocalPlayerStateChange('armor', (value) => {
      const entity = this.platform.getLocalPlayerPed()
      if (typeof value !== 'number' || entity === 0) return
      this.platform.setPedArmour(entity, value)
    })
  }
}
