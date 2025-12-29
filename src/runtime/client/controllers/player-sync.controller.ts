import { Controller } from '../decorators'

/**
 * Client-side service that syncs player health and armor from server state bags.
 *
 * @remarks
 * Listens to state bag changes from the server and applies them to the local player ped.
 * This allows the server to control player health and armor through simple state bag updates.
 */
@Controller()
export class PlayerSyncController {
  constructor() {
    this.registerStateBagHandlers()
  }

  private registerStateBagHandlers(): void {
    // Sync health from server state bag to local ped
    AddStateBagChangeHandler('health', '', (bagName: string, _key: string, value: number) => {
      const entity = GetEntityFromStateBagName(bagName)
      if (entity === 0) return

      const playerPed = PlayerPedId()
      if (entity !== playerPed) return

      // Apply health to local ped
      SetEntityHealth(entity, value)
    })

    // Sync armor from server state bag to local ped
    AddStateBagChangeHandler('armor', '', (bagName: string, _key: string, value: number) => {
      const entity = GetEntityFromStateBagName(bagName)
      if (entity === 0) return

      const playerPed = PlayerPedId()
      if (entity !== playerPed) return

      // Apply armor to local ped
      SetPedArmour(entity, value)
    })
  }
}
