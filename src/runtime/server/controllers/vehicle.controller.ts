import { inject } from 'tsyringe'
import { EventsAPI } from '../../../adapters/contracts/transport/events.api'
import { SYSTEM_EVENTS } from '../../shared/types/system-types'
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
  constructor(
    @inject(Vehicles) private readonly vehicleService: Vehicles,
    @inject(EventsAPI as any) private readonly events: EventsAPI<'server'>,
  ) {}
  /**
   * Handles client request to get vehicle data.
   */
  @OnNet(SYSTEM_EVENTS.vehicle.getData)
  handleGetData(player: Player, networkId: number) {
    const vehicle = this.vehicleService.getByNetworkId(networkId)
    if (!vehicle) {
      this.events.emit(SYSTEM_EVENTS.vehicle.dataResult, player.clientID, null)
      return null
    }

    const data = vehicle.serialize()
    this.events.emit(SYSTEM_EVENTS.vehicle.dataResult, player.clientID, data)

    return data
  }

  /**
   * Handles client request to get all player vehicles.
   */
  @OnNet(SYSTEM_EVENTS.vehicle.getPlayerVehicles)
  handleGetPlayerVehicles(player: Player) {
    const vehicles = this.vehicleService.getPlayerVehicles(player.clientID)
    const serialized = vehicles.map((v) => v.serialize())

    this.events.emit(SYSTEM_EVENTS.vehicle.playerVehiclesResult, player.clientID, serialized)

    return serialized
  }
}
