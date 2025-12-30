import { injectable } from 'tsyringe'
import { Vector3 } from '../../../kernel/utils'
import {
  SerializedVehicleData,
  VehicleCreateOptions,
  VehicleSpawnResult,
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
   * Applies vehicle mods from state bag data.
   *
   * @param vehicle - Vehicle handle
   * @param mods - Mods object from state bag
   */
  applyMods(vehicle: number, mods: Record<string, any>): void {
    if (!DoesEntityExist(vehicle)) return

    SetVehicleModKit(vehicle, 0)

    if (mods.spoiler !== undefined) SetVehicleMod(vehicle, 0, mods.spoiler, false)
    if (mods.frontBumper !== undefined) SetVehicleMod(vehicle, 1, mods.frontBumper, false)
    if (mods.rearBumper !== undefined) SetVehicleMod(vehicle, 2, mods.rearBumper, false)
    if (mods.sideSkirt !== undefined) SetVehicleMod(vehicle, 3, mods.sideSkirt, false)
    if (mods.exhaust !== undefined) SetVehicleMod(vehicle, 4, mods.exhaust, false)
    if (mods.frame !== undefined) SetVehicleMod(vehicle, 5, mods.frame, false)
    if (mods.grille !== undefined) SetVehicleMod(vehicle, 6, mods.grille, false)
    if (mods.hood !== undefined) SetVehicleMod(vehicle, 7, mods.hood, false)
    if (mods.fender !== undefined) SetVehicleMod(vehicle, 8, mods.fender, false)
    if (mods.rightFender !== undefined) SetVehicleMod(vehicle, 9, mods.rightFender, false)
    if (mods.roof !== undefined) SetVehicleMod(vehicle, 10, mods.roof, false)
    if (mods.engine !== undefined) SetVehicleMod(vehicle, 11, mods.engine, false)
    if (mods.brakes !== undefined) SetVehicleMod(vehicle, 12, mods.brakes, false)
    if (mods.transmission !== undefined) SetVehicleMod(vehicle, 13, mods.transmission, false)
    if (mods.horns !== undefined) SetVehicleMod(vehicle, 14, mods.horns, false)
    if (mods.suspension !== undefined) SetVehicleMod(vehicle, 15, mods.suspension, false)
    if (mods.armor !== undefined) SetVehicleMod(vehicle, 16, mods.armor, false)

    if (mods.turbo !== undefined) ToggleVehicleMod(vehicle, 18, mods.turbo)
    if (mods.xenon !== undefined) ToggleVehicleMod(vehicle, 22, mods.xenon)

    if (mods.wheelType !== undefined) SetVehicleWheelType(vehicle, mods.wheelType)
    if (mods.wheels !== undefined) SetVehicleMod(vehicle, 23, mods.wheels, false)
    if (mods.windowTint !== undefined) SetVehicleWindowTint(vehicle, mods.windowTint)
    if (mods.livery !== undefined) SetVehicleLivery(vehicle, mods.livery)
    if (mods.plateStyle !== undefined) SetVehicleNumberPlateTextIndex(vehicle, mods.plateStyle)

    if (mods.neonEnabled !== undefined) {
      SetVehicleNeonLightEnabled(vehicle, 0, mods.neonEnabled[0])
      SetVehicleNeonLightEnabled(vehicle, 1, mods.neonEnabled[1])
      SetVehicleNeonLightEnabled(vehicle, 2, mods.neonEnabled[2])
      SetVehicleNeonLightEnabled(vehicle, 3, mods.neonEnabled[3])
    }

    if (mods.neonColor !== undefined) {
      SetVehicleNeonLightsColour(vehicle, mods.neonColor[0], mods.neonColor[1], mods.neonColor[2])
    }

    if (mods.extras) {
      for (const [extraId, enabled] of Object.entries(mods.extras)) {
        SetVehicleExtra(vehicle, Number(extraId), !enabled)
      }
    }

    if (mods.pearlescentColor !== undefined || mods.wheelColor !== undefined) {
      const [currentPearl, currentWheel] = GetVehicleExtraColours(vehicle)
      SetVehicleExtraColours(
        vehicle,
        mods.pearlescentColor ?? currentPearl,
        mods.wheelColor ?? currentWheel,
      )
    }
  }

  /**
   * Repairs a vehicle completely (client-side).
   *
   * @param vehicle - Vehicle handle
   */
  repair(vehicle: number): void {
    if (!DoesEntityExist(vehicle)) return

    SetVehicleFixed(vehicle)
    SetVehicleDeformationFixed(vehicle)
    SetVehicleUndriveable(vehicle, false)
    SetVehicleEngineOn(vehicle, true, true, false)
    SetVehicleEngineHealth(vehicle, 1000.0)
    SetVehiclePetrolTankHealth(vehicle, 1000.0)
  }

  /**
   * Sets fuel level on a vehicle (client-side).
   *
   * @param vehicle - Vehicle handle
   * @param level - Fuel level (0-100)
   */
  setFuel(vehicle: number, level: number): void {
    if (!DoesEntityExist(vehicle)) return
    SetVehicleFuelLevel(vehicle, Math.max(0, Math.min(100, level)))
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

    onNet('opencore:vehicle:created', async (data: SerializedVehicleData) => {
      // Wait for vehicle to exist locally
      const started = GetGameTimer()
      let veh = 0

      while (GetGameTimer() - started < 5000) {
        veh = this.getVehicleFromNetworkId(data.networkId)
        if (veh && DoesEntityExist(veh)) break
        await new Promise((r) => setTimeout(r, 0))
      }

      if (veh && DoesEntityExist(veh)) {
        // Apply mods from server data
        if (data.mods && Object.keys(data.mods).length > 0) {
          this.applyMods(veh, data.mods)
        }

        // Apply fuel from metadata
        if (data.metadata?.fuel !== undefined) {
          this.setFuel(veh, data.metadata.fuel)
        }
      }
    })

    onNet('opencore:vehicle:deleted', (networkId: number) => {
      console.log('[VehicleClient] Vehicle deleted:', networkId)
    })

    onNet('opencore:vehicle:modified', (data: { networkId: number; mods: any }) => {
      const veh = this.getVehicleFromNetworkId(data.networkId)
      if (veh && DoesEntityExist(veh)) {
        this.applyMods(veh, data.mods)
      }
    })

    onNet('opencore:vehicle:repaired', (networkId: number) => {
      const veh = this.getVehicleFromNetworkId(networkId)
      if (veh && DoesEntityExist(veh)) {
        this.repair(veh)
      }
    })

    onNet('opencore:vehicle:lockedChanged', (data: { networkId: number; locked: boolean }) => {
      console.log('[VehicleClient] Vehicle lock changed:', data.networkId, data.locked)
    })

    onNet('opencore:vehicle:warpInto', async (networkId: number, seatIndex: number = -1) => {
      const started = GetGameTimer()
      let veh = 0

      while (GetGameTimer() - started < 5000) {
        veh = this.getVehicleFromNetworkId(networkId)
        if (veh && DoesEntityExist(veh)) break
        await new Promise((r) => setTimeout(r, 0))
      }

      if (veh && DoesEntityExist(veh)) {
        this.warpIntoVehicle(veh, seatIndex)
      } else {
        console.error('[VehicleClient] Failed to warp into vehicle:', networkId)
      }
    })
  }
}
