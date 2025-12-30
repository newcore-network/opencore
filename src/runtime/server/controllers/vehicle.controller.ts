import { inject, injectable } from 'tsyringe'
import { coreLogger } from '../../../kernel/shared/logger'
import { Controller, OnNet } from '../decorators'
import { Player } from '../entities/player'
import { VehicleService } from '../services/vehicle.service'
import { VehicleModificationService } from '../services/vehicle-modification.service'
import { VehicleCreateOptions, VehicleModificationOptions } from '../types/vehicle.types'

/**
 * Controller for handling vehicle-related network events.
 *
 * All client requests for vehicle operations go through this controller
 * for validation and security checks.
 */
@Controller()
@injectable()
export class VehicleController {
  constructor(
    @inject(VehicleService) private readonly vehicleService: VehicleService,
    @inject(VehicleModificationService)
    private readonly modificationService: VehicleModificationService,
  ) {}

  /**
   * Handles client request to create a vehicle.
   */
  @OnNet('opencore:vehicle:create')
  async handleCreateVehicle(player: Player, options: VehicleCreateOptions) {
    const source = player.clientID

    coreLogger.debug('Vehicle creation requested', { clientID: source, options })

    const result = await this.vehicleService.createForPlayer(source, options)

    emitNet('opencore:vehicle:createResult', source, result)

    return result
  }

  /**
   * Handles client request to delete a vehicle.
   */
  @OnNet('opencore:vehicle:delete')
  handleDeleteVehicle(player: Player, networkId: number) {
    const source = player.clientID

    coreLogger.debug('Vehicle deletion requested', { clientID: source, networkId })

    const success = this.vehicleService.delete(networkId, source)

    emitNet('opencore:vehicle:deleteResult', source, { networkId, success })

    return success
  }

  /**
   * Handles client request to modify a vehicle.
   */
  @OnNet('opencore:vehicle:modify')
  handleModifyVehicle(player: Player, options: VehicleModificationOptions) {
    const source = player.clientID

    coreLogger.debug('Vehicle modification requested', { clientID: source, options })

    const success = this.modificationService.applyModifications({
      ...options,
      requestedBy: source,
    })

    emitNet('opencore:vehicle:modifyResult', source, { networkId: options.networkId, success })

    return success
  }

  /**
   * Handles client request to repair a vehicle.
   */
  @OnNet('opencore:vehicle:repair')
  handleRepairVehicle(player: Player, networkId: number) {
    const source = player.clientID

    coreLogger.debug('Vehicle repair requested', { clientID: source, networkId })

    if (!this.vehicleService.validateOwnership(networkId, source)) {
      emitNet('opencore:vehicle:repairResult', source, { networkId, success: false })
      return false
    }

    const vehicle = this.vehicleService.getByNetworkId(networkId)
    if (!vehicle) {
      emitNet('opencore:vehicle:repairResult', source, { networkId, success: false })
      return false
    }

    emitNet('opencore:vehicle:repairResult', source, { networkId, success: true })
    emitNet('opencore:vehicle:repaired', -1, networkId)

    return true
  }

  /**
   * Handles client request to set vehicle fuel.
   */
  @OnNet('opencore:vehicle:setFuel')
  handleSetFuel(player: Player, networkId: number, level: number) {
    const source = player.clientID

    if (!this.vehicleService.validateOwnership(networkId, source)) {
      return false
    }

    const vehicle = this.vehicleService.getByNetworkId(networkId)
    if (!vehicle) return false

    vehicle.setFuel(level)

    return true
  }

  /**
   * Handles client request to lock/unlock vehicle doors.
   */
  @OnNet('opencore:vehicle:setLocked')
  handleSetLocked(player: Player, networkId: number, locked: boolean) {
    const source = player.clientID

    if (!this.vehicleService.validateOwnership(networkId, source)) {
      return false
    }

    if (!this.vehicleService.validateProximity(networkId, source, 10.0)) {
      return false
    }

    const vehicle = this.vehicleService.getByNetworkId(networkId)
    if (!vehicle) return false

    vehicle.setDoorsLocked(locked)

    emitNet('opencore:vehicle:lockedChanged', -1, { networkId, locked })

    return true
  }

  /**
   * Handles client request to get vehicle data.
   */
  @OnNet('opencore:vehicle:getData')
  handleGetData(player: Player, networkId: number) {
    const source = player.clientID

    const vehicle = this.vehicleService.getByNetworkId(networkId)
    if (!vehicle) {
      emitNet('opencore:vehicle:dataResult', source, null)
      return null
    }

    const data = vehicle.serialize()
    emitNet('opencore:vehicle:dataResult', source, data)

    return data
  }

  /**
   * Handles client request to get all player vehicles.
   */
  @OnNet('opencore:vehicle:getPlayerVehicles')
  handleGetPlayerVehicles(player: Player) {
    const source = player.clientID

    const vehicles = this.vehicleService.getPlayerVehicles(source)
    const serialized = vehicles.map((v) => v.serialize())

    emitNet('opencore:vehicle:playerVehiclesResult', source, serialized)

    return serialized
  }

  /**
   * Handles client request to teleport a vehicle.
   */
  @OnNet('opencore:vehicle:teleport')
  handleTeleport(
    player: Player,
    networkId: number,
    position: { x: number; y: number; z: number },
    heading?: number,
  ) {
    const source = player.clientID

    if (!this.vehicleService.validateOwnership(networkId, source)) {
      return false
    }

    const vehicle = this.vehicleService.getByNetworkId(networkId)
    if (!vehicle) return false

    vehicle.teleport(position, heading)

    emitNet('opencore:vehicle:teleported', -1, { networkId, position, heading })

    return true
  }
}
