import { injectable } from 'tsyringe'
import type { Vector3 } from '../../../kernel/utils'
import type {
  VehicleCreateOptions,
  VehicleSpawnResult,
  SerializedVehicleData,
} from '../../server/types/vehicle.types'

/**
 * Client-side vehicle service.
 *
 * This service provides a simplified interface for vehicle operations on the client.
 * Most operations delegate to the server for security and synchronization.
 *
 * @remarks
 * - Vehicle creation is server-authoritative (prevents spawning exploits)
 * - Modifications require server validation
 * - Local operations (queries, visual changes) are safe to perform client-side
 */
@injectable()
export class VehicleClientService {
  private pendingCreations = new Map<number, (result: VehicleSpawnResult) => void>()
  private requestIdCounter = 0

  constructor() {
    this.registerEventHandlers()
  }

  /**
   * Requests vehicle creation from the server.
   *
   * @param options - Vehicle creation options
   * @returns Promise resolving to spawn result
   */
  async createVehicle(
    options: Omit<VehicleCreateOptions, 'ownership'>,
  ): Promise<VehicleSpawnResult> {
    return new Promise((resolve) => {
      const requestId = this.requestIdCounter++
      this.pendingCreations.set(requestId, resolve)

      emitNet('opencore:vehicle:create', {
        ...options,
        _requestId: requestId,
      })

      setTimeout(() => {
        if (this.pendingCreations.has(requestId)) {
          this.pendingCreations.delete(requestId)
          resolve({
            networkId: 0,
            handle: 0,
            success: false,
            error: 'Request timeout',
          })
        }
      }, 5000)
    })
  }

  /**
   * Requests vehicle deletion from the server.
   *
   * @param networkId - Network ID of the vehicle
   * @returns Promise resolving to success status
   */
  async deleteVehicle(networkId: number): Promise<boolean> {
    return new Promise((resolve) => {
      const handler = (result: { networkId: number; success: boolean }) => {
        if (result.networkId === networkId) {
          resolve(result.success)
        }
      }

      const eventName = 'opencore:vehicle:deleteResult'
      onNet(eventName, handler)

      emitNet('opencore:vehicle:delete', networkId)

      setTimeout(() => {
        // @ts-ignore
        removeEventListener(eventName, handler)
        resolve(false)
      }, 5000)
    })
  }

  /**
   * Requests vehicle repair from the server.
   *
   * @param networkId - Network ID of the vehicle
   * @returns Promise resolving to success status
   */
  async repairVehicle(networkId: number): Promise<boolean> {
    return new Promise((resolve) => {
      const handler = (result: { networkId: number; success: boolean }) => {
        if (result.networkId === networkId) {
          resolve(result.success)
        }
      }

      const eventName = 'opencore:vehicle:repairResult'
      onNet(eventName, handler)

      emitNet('opencore:vehicle:repair', networkId)

      setTimeout(() => {
        // @ts-ignore
        removeEventListener(eventName, handler)
        resolve(false)
      }, 5000)
    })
  }

  /**
   * Gets the closest vehicle to the player.
   *
   * @param radius - Search radius
   * @returns Vehicle handle or null
   */
  getClosestVehicle(radius = 10.0): number | null {
    const playerPed = PlayerPedId()
    const [px, py, pz] = GetEntityCoords(playerPed, true)

    const vehicle = GetClosestVehicle(px, py, pz, radius, 0, 71)
    return vehicle !== 0 ? vehicle : null
  }

  /**
   * Checks if the player is in a vehicle.
   */
  isPlayerInVehicle(): boolean {
    return IsPedInAnyVehicle(PlayerPedId(), false)
  }

  /**
   * Gets the vehicle the player is currently in.
   *
   * @returns Vehicle handle or null
   */
  getCurrentVehicle(): number | null {
    const ped = PlayerPedId()
    if (!IsPedInAnyVehicle(ped, false)) return null
    return GetVehiclePedIsIn(ped, false)
  }

  /**
   * Gets the last vehicle the player was in.
   *
   * @returns Vehicle handle or null
   */
  getLastVehicle(): number | null {
    const vehicle = GetVehiclePedIsIn(PlayerPedId(), true)
    return vehicle !== 0 ? vehicle : null
  }

  /**
   * Checks if player is the driver of their current vehicle.
   */
  isPlayerDriver(): boolean {
    const vehicle = this.getCurrentVehicle()
    if (!vehicle) return false
    return GetPedInVehicleSeat(vehicle, -1) === PlayerPedId()
  }

  /**
   * Gets vehicle speed in km/h.
   *
   * @param vehicle - Vehicle handle
   */
  getSpeed(vehicle: number): number {
    if (!DoesEntityExist(vehicle)) return 0
    return GetEntitySpeed(vehicle) * 3.6
  }

  /**
   * Gets the network ID from a vehicle handle.
   *
   * @param vehicle - Vehicle handle
   * @returns Network ID or 0 if invalid
   */
  getNetworkId(vehicle: number): number {
    if (!DoesEntityExist(vehicle)) return 0
    return NetworkGetNetworkIdFromEntity(vehicle)
  }

  /**
   * Gets the vehicle handle from a network ID.
   *
   * @param networkId - Network ID
   * @returns Vehicle handle or 0 if not found
   */
  getVehicleFromNetworkId(networkId: number): number {
    if (!NetworkDoesEntityExistWithNetworkId(networkId)) return 0
    return NetworkGetEntityFromNetworkId(networkId)
  }

  /**
   * Gets vehicle data from state bag.
   *
   * @param vehicle - Vehicle handle
   * @param key - State bag key
   * @returns State value or undefined
   */
  getVehicleState<T = any>(vehicle: number, key: string): T | undefined {
    if (!DoesEntityExist(vehicle)) return undefined
    const stateBag = Entity(vehicle).state
    return stateBag[key] as T | undefined
  }

  /**
   * Requests to lock/unlock vehicle doors.
   *
   * @param networkId - Network ID of the vehicle
   * @param locked - Whether to lock or unlock
   */
  setDoorsLocked(networkId: number, locked: boolean): void {
    emitNet('opencore:vehicle:setLocked', networkId, locked)
  }

  /**
   * Requests vehicle data from the server.
   *
   * @param networkId - Network ID of the vehicle
   * @returns Promise resolving to vehicle data
   */
  async getVehicleData(networkId: number): Promise<SerializedVehicleData | null> {
    return new Promise((resolve) => {
      const handler = (data: SerializedVehicleData | null) => {
        resolve(data)
      }

      const eventName = 'opencore:vehicle:dataResult'
      onNet(eventName, handler)

      emitNet('opencore:vehicle:getData', networkId)

      setTimeout(() => {
        // @ts-ignore
        removeEventListener(eventName, handler)
        resolve(null)
      }, 5000)
    })
  }

  /**
   * Requests all player vehicles from the server.
   *
   * @returns Promise resolving to array of vehicle data
   */
  async getPlayerVehicles(): Promise<SerializedVehicleData[]> {
    return new Promise((resolve) => {
      const handler = (vehicles: SerializedVehicleData[]) => {
        resolve(vehicles)
      }

      const eventName = 'opencore:vehicle:playerVehiclesResult'
      onNet(eventName, handler)

      emitNet('opencore:vehicle:getPlayerVehicles')

      setTimeout(() => {
        // @ts-ignore
        removeEventListener(eventName, handler)
        resolve([])
      }, 5000)
    })
  }

  /**
   * Local-only: Warps player into a vehicle.
   *
   * @param vehicle - Vehicle handle
   * @param seatIndex - Seat index (-1 = driver)
   */
  warpIntoVehicle(vehicle: number, seatIndex: number = -1): void {
    if (!DoesEntityExist(vehicle)) return
    TaskWarpPedIntoVehicle(PlayerPedId(), vehicle, seatIndex)
  }

  /**
   * Local-only: Sets vehicle heading.
   *
   * @param vehicle - Vehicle handle
   * @param heading - Heading in degrees
   */
  setHeading(vehicle: number, heading: number): void {
    if (!DoesEntityExist(vehicle)) return
    SetEntityHeading(vehicle, heading)
  }

  /**
   * Local-only: Gets vehicle position.
   *
   * @param vehicle - Vehicle handle
   * @returns Position vector
   */
  getPosition(vehicle: number): Vector3 | null {
    if (!DoesEntityExist(vehicle)) return null
    const coords = GetEntityCoords(vehicle, true)
    return { x: coords[0], y: coords[1], z: coords[2] }
  }

  /**
   * Local-only: Gets vehicle heading.
   *
   * @param vehicle - Vehicle handle
   * @returns Heading in degrees
   */
  getHeading(vehicle: number): number {
    if (!DoesEntityExist(vehicle)) return 0
    return GetEntityHeading(vehicle)
  }

  /**
   * Local-only: Gets vehicle model hash.
   *
   * @param vehicle - Vehicle handle
   * @returns Model hash
   */
  getModel(vehicle: number): number {
    if (!DoesEntityExist(vehicle)) return 0
    return GetEntityModel(vehicle)
  }

  /**
   * Local-only: Gets vehicle license plate.
   *
   * @param vehicle - Vehicle handle
   * @returns License plate text
   */
  getPlate(vehicle: number): string {
    if (!DoesEntityExist(vehicle)) return ''
    return GetVehicleNumberPlateText(vehicle)
  }

  /**
   * Registers event handlers for server responses.
   */
  private registerEventHandlers(): void {
    onNet(
      'opencore:vehicle:createResult',
      (result: VehicleSpawnResult & { _requestId?: number }) => {
        if (result._requestId !== undefined) {
          const callback = this.pendingCreations.get(result._requestId)
          if (callback) {
            callback(result)
            this.pendingCreations.delete(result._requestId)
          }
        }
      },
    )

    onNet('opencore:vehicle:created', (data: SerializedVehicleData) => {
      console.log('[VehicleClient] Vehicle created:', data.networkId)
    })

    onNet('opencore:vehicle:deleted', (networkId: number) => {
      console.log('[VehicleClient] Vehicle deleted:', networkId)
    })

    onNet('opencore:vehicle:modified', (data: { networkId: number; mods: any }) => {
      console.log('[VehicleClient] Vehicle modified:', data.networkId)
    })

    onNet('opencore:vehicle:repaired', (networkId: number) => {
      console.log('[VehicleClient] Vehicle repaired:', networkId)
    })

    onNet('opencore:vehicle:lockedChanged', (data: { networkId: number; locked: boolean }) => {
      console.log('[VehicleClient] Vehicle lock changed:', data.networkId, data.locked)
    })
  }
}
