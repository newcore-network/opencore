import { inject } from 'tsyringe'
import { Controller, OnNet } from '../decorators'
import { Player } from '../entities/player'
import { Vehicles } from '../apis/vehicles.api'

/**
 * Controller for handling vehicle-related network events.
 *
 * All client requests for vehicle operations go through this controller
 * for validation and security checks.
 */
@Controller()
export class VehicleController {
  constructor(@inject(Vehicles) private readonly vehicleService: Vehicles) {}
  /**
   * Handles client request to get vehicle data.
   */
  @OnNet('opencore:vehicle:getData')
  handleGetData(player: Player, networkId: number) {
    const vehicle = this.vehicleService.getByNetworkId(networkId)
    if (!vehicle) {
      emitNet('opencore:vehicle:dataResult', player.clientID, null)
      return null
    }

    const data = vehicle.serialize()
    emitNet('opencore:vehicle:dataResult', player.clientID, data)

    return data
  }

  /**
   * Handles client request to get all player vehicles.
   */
  @OnNet('opencore:vehicle:getPlayerVehicles')
  handleGetPlayerVehicles(player: Player) {
    const vehicles = this.vehicleService.getPlayerVehicles(player.clientID)
    const serialized = vehicles.map((v) => v.serialize())

    emitNet('opencore:vehicle:playerVehiclesResult', player.clientID, serialized)

    return serialized
  }
}
