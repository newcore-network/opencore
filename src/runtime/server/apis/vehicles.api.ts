import { inject, injectable } from 'tsyringe'
import { IHasher } from '../../../adapters/contracts/IHasher'
import { EventsAPI } from '../../../adapters/contracts/transport/events.api'
import { IEntityServer } from '../../../adapters/contracts/server/IEntityServer'
import { IPlayerServer } from '../../../adapters/contracts/server/IPlayerServer'
import { IVehicleServer } from '../../../adapters/contracts/server/IVehicleServer'
import { coreLogger } from '../../../kernel/logger'
import { Vehicle, type VehicleAdapters } from '../entities/vehicle'
import {
  SerializedVehicleData,
  VehicleCreateOptions,
  VehicleSpawnResult,
} from '../types/vehicle.types'
import { Players } from '../ports/players.api-port'

/**
 * Server-side service for managing vehicle entities.
 *
 * This service is the central authority for all vehicle operations:
 * - Creating vehicles server-side (prevents client-side spawning abuse)
 * - Managing vehicle registry by Network ID
 * - Validating permissions and positions
 * - Synchronizing vehicle state across clients
 *
 * @remarks
 * All vehicle creation MUST go through this service to ensure security.
 * Uses CreateVehicleServerSetter for server-authoritative spawning.
 */
@injectable()
export class Vehicles {
  /**
   * Internal registry of all managed vehicles indexed by Network ID
   */
  private vehiclesByNetworkId = new Map<number, Vehicle>()

  /**
   * Cached adapters bundle for Vehicle instances
   */
  private readonly vehicleAdapters: VehicleAdapters

  constructor(
    @inject(Players as any) private readonly playerDirectory: Players,
    @inject(IEntityServer as any) private readonly entityServer: IEntityServer,
    @inject(IVehicleServer as any) private readonly vehicleServer: IVehicleServer,
    @inject(IHasher as any) private readonly hasher: IHasher,
    @inject(IPlayerServer as any) private readonly playerServer: IPlayerServer,
    @inject(EventsAPI as any) private readonly events: EventsAPI,
  ) {
    this.vehicleAdapters = {
      entityServer: this.entityServer,
      vehicleServer: this.vehicleServer,
    }
  }

  /**
   * Creates a new vehicle on the server.
   *
   * This method uses CreateVehicleServerSetter to spawn the vehicle server-side,
   * preventing client-side spawning exploits.
   *
   * @param options - Vehicle creation options
   * @returns Spawn result with network ID and handle
   */
  async create(options: VehicleCreateOptions): Promise<VehicleSpawnResult> {
    try {
      const {
        model,
        position,
        heading = 0,
        plate,
        primaryColor,
        secondaryColor,
        mods,
        persistent = false,
        ownership,
        metadata,
        routingBucket = 0,
        locked = false,
        fuel = 100.0,
      } = options

      const modelHash = typeof model === 'string' ? this.hasher.getHashKey(model) : model

      const vehicleType = 'automobile'
      const handle = this.vehicleServer.createServerSetter(
        modelHash,
        vehicleType,
        position.x,
        position.y,
        position.z,
        heading,
      )

      if (!handle || handle === 0) {
        coreLogger.error('Failed to create vehicle', { model, position })
        return {
          networkId: 0,
          handle: 0,
          success: false,
          error: 'Failed to create vehicle entity',
        }
      }

      while (!this.entityServer.doesExist(handle)) {
        await new Promise((resolve) => setTimeout(resolve, 0))
      }

      const networkId = this.vehicleServer.getNetworkIdFromEntity(handle)

      const vehicleOwnership = {
        clientID: ownership?.clientID,
        accountID: ownership?.accountID,
        type: ownership?.type ?? 'temporary',
      }

      const vehicle = new Vehicle(
        handle,
        networkId,
        vehicleOwnership,
        this.vehicleAdapters,
        persistent,
        routingBucket,
        model,
        modelHash,
      )

      // Server-side operations (these natives work on server)
      if (plate) {
        vehicle.setPlate(plate)
      }

      if (primaryColor !== undefined || secondaryColor !== undefined) {
        vehicle.setColors(primaryColor, secondaryColor)
      }

      // Mods stored in state bag, applied client-side
      if (mods) {
        vehicle.setMods(mods)
      }

      if (metadata) {
        for (const [key, value] of Object.entries(metadata)) {
          vehicle.setMetadata(key, value)
        }
      }

      vehicle.setDoorsLocked(locked)
      vehicle.setFuel(fuel)

      if (routingBucket !== 0) {
        vehicle.setRoutingBucket(routingBucket)
      }

      this.vehiclesByNetworkId.set(networkId, vehicle)

      coreLogger.info('Vehicle created', {
        networkId,
        model,
        ownership: vehicleOwnership.type,
        persistent,
        totalVehicles: this.vehiclesByNetworkId.size,
      })

      this.events.emit('opencore:vehicle:created', 'all', vehicle.serialize())

      return {
        networkId,
        handle,
        success: true,
      }
    } catch (error: unknown) {
      const errorInfo =
        error instanceof Error
          ? { message: error.message, name: error.name, stack: error.stack }
          : { message: String(error) }

      coreLogger.error('Error creating vehicle', { error: errorInfo, options })
      return {
        networkId: 0,
        handle: 0,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }
    }
  }

  /**
   * Creates a vehicle for a specific player.
   *
   * @param clientID - Client ID of the requesting player
   * @param options - Vehicle creation options
   * @returns Spawn result
   */
  async createForPlayer(
    clientID: number,
    options: VehicleCreateOptions,
  ): Promise<VehicleSpawnResult> {
    const player = this.playerDirectory.getByClient(clientID)
    if (!player) {
      return {
        networkId: 0,
        handle: 0,
        success: false,
        error: 'Player not found',
      }
    }

    const ownership = {
      clientID,
      accountID: player.accountID,
      type: 'player' as const,
    }

    const result = await this.create({
      ...options,
      ownership,
    })
    if (result.success) {
      this.events.emit('opencore:vehicle:warpInto', clientID, result.networkId, -1)
    }
    return result
  }

  /**
   * Retrieves a vehicle by its Network ID.
   *
   * @param networkId - Network ID of the vehicle
   * @returns Vehicle entity or undefined
   */
  getByNetworkId(networkId: number): Vehicle | undefined {
    return this.vehiclesByNetworkId.get(networkId)
  }

  /**
   * Retrieves a vehicle by its entity handle.
   *
   * @param handle - Entity handle
   * @returns Vehicle entity or undefined
   */
  getByHandle(handle: number): Vehicle | undefined {
    const networkId = this.vehicleServer.getNetworkIdFromEntity(handle)
    return this.vehiclesByNetworkId.get(networkId)
  }

  /**
   * Gets all vehicles owned by a specific player.
   *
   * @param clientID - Client ID of the owner
   * @returns Array of vehicles
   */
  getPlayerVehicles(clientID: number): Vehicle[] {
    const vehicles: Vehicle[] = []
    for (const vehicle of this.vehiclesByNetworkId.values()) {
      if (vehicle.ownership.clientID === clientID) {
        vehicles.push(vehicle)
      }
    }
    return vehicles
  }

  /**
   * Gets all vehicles in a specific routing bucket.
   *
   * @param bucket - Routing bucket ID
   * @returns Array of vehicles
   */
  getVehiclesInBucket(bucket: number): Vehicle[] {
    const vehicles: Vehicle[] = []
    for (const vehicle of this.vehiclesByNetworkId.values()) {
      if (vehicle.routingBucket === bucket) {
        vehicles.push(vehicle)
      }
    }
    return vehicles
  }

  /**
   * Gets all managed vehicles.
   *
   * @returns Array of all vehicles
   */
  getAll(): Vehicle[] {
    return Array.from(this.vehiclesByNetworkId.values())
  }

  /**
   * Deletes a vehicle from the server.
   *
   * @param networkId - Network ID of the vehicle to delete
   * @param requestedBy - Optional client ID for permission validation
   * @returns Success status
   */
  delete(networkId: number, requestedBy?: number): boolean {
    const vehicle = this.vehiclesByNetworkId.get(networkId)
    if (!vehicle) {
      return false
    }

    if (requestedBy !== undefined) {
      if (vehicle.ownership.clientID !== requestedBy) {
        coreLogger.warn('Unauthorized vehicle deletion attempt', {
          networkId,
          requestedBy,
          owner: vehicle.ownership.clientID,
        })
        return false
      }
    }

    vehicle.delete()
    this.vehiclesByNetworkId.delete(networkId)

    coreLogger.info('Vehicle deleted', {
      networkId,
      totalVehicles: this.vehiclesByNetworkId.size,
    })

    this.events.emit('opencore:vehicle:deleted', 'all', networkId)

    return true
  }

  /**
   * Deletes all vehicles owned by a player.
   * Useful when a player disconnects.
   *
   * @param clientID - Client ID of the owner
   */
  deletePlayerVehicles(clientID: number): void {
    const vehicles = this.getPlayerVehicles(clientID)
    for (const vehicle of vehicles) {
      this.delete(vehicle.networkId)
    }
  }

  /**
   * Validates if a player can perform an action on a vehicle.
   *
   * @param networkId - Network ID of the vehicle
   * @param clientID - Client ID of the player
   * @returns True if authorized
   */
  validateOwnership(networkId: number, clientID: number): boolean {
    const vehicle = this.vehiclesByNetworkId.get(networkId)
    if (!vehicle) return false

    if (vehicle.ownership.type === 'server' || vehicle.ownership.type === 'shared') {
      return true
    }

    return vehicle.ownership.clientID === clientID
  }

  /**
   * Validates if a player is near a vehicle.
   *
   * @param networkId - Network ID of the vehicle
   * @param clientID - Client ID of the player
   * @param maxDistance - Maximum distance in units
   * @returns True if within range
   */
  validateProximity(networkId: number, clientID: number, maxDistance: number = 10.0): boolean {
    const vehicle = this.vehiclesByNetworkId.get(networkId)
    if (!vehicle || !vehicle.exists) return false

    const player = this.playerDirectory.getByClient(clientID)
    if (!player) return false

    const playerPed = this.playerServer.getPed(player.clientID.toString())
    if (!playerPed || playerPed === 0) return false

    const playerPos = this.entityServer.getCoords(playerPed)
    const vehiclePos = vehicle.position

    const distance = Math.sqrt(
      (playerPos.x - vehiclePos.x) ** 2 +
        (playerPos.y - vehiclePos.y) ** 2 +
        (playerPos.z - vehiclePos.z) ** 2,
    )

    return distance <= maxDistance
  }

  /**
   * Cleans up orphaned vehicles that no longer exist.
   */
  cleanup(): void {
    const toDelete: number[] = []

    for (const [networkId, vehicle] of this.vehiclesByNetworkId.entries()) {
      if (!vehicle.exists) {
        toDelete.push(networkId)
      }
    }

    for (const networkId of toDelete) {
      this.vehiclesByNetworkId.delete(networkId)
      coreLogger.debug('Cleaned up orphaned vehicle', { networkId })
    }

    if (toDelete.length > 0) {
      coreLogger.info('Vehicle cleanup completed', {
        cleaned: toDelete.length,
        remaining: this.vehiclesByNetworkId.size,
      })
    }
  }

  /**
   * Gets the total count of managed vehicles.
   *
   * @returns Vehicle count
   */
  getCount(): number {
    return this.vehiclesByNetworkId.size
  }

  /**
   * Serializes all vehicles for data transfer.
   *
   * @returns Array of serialized vehicle data
   */
  serializeAll(): SerializedVehicleData[] {
    return Array.from(this.vehiclesByNetworkId.values()).map((v) => v.serialize())
  }
}
