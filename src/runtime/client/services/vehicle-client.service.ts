import { inject, injectable } from 'tsyringe'
import { IClientVehiclePort } from '../../../adapters/contracts/client/vehicle/IClientVehiclePort'
import { EventsAPI } from '../../../adapters/contracts/transport/events.api'
import { Vector3 } from '../../../kernel/utils/vector3'
import { SYSTEM_EVENTS } from '../../shared/types/system-types'
import { IClientRuntimeBridge } from '../adapter/runtime-bridge'
import {
  SerializedVehicleData,
  VehicleCreateOptions,
  VehicleSpawnResult,
} from '../../server/types/vehicle.types'

@injectable()
export class VehicleClientService {
  private pendingCreations = new Map<number, (result: VehicleSpawnResult) => void>()
  private pendingDeletes = new Map<number, (result: boolean) => void>()
  private pendingRepairs = new Map<number, (result: boolean) => void>()
  private pendingData = new Map<number, (result: SerializedVehicleData | null) => void>()
  private pendingPlayerVehicles: ((vehicles: SerializedVehicleData[]) => void) | null = null
  private requestIdCounter = 0

  constructor(
    @inject(EventsAPI as any) private readonly events: EventsAPI<'client'>,
    @inject(IClientVehiclePort as any) private readonly vehicles: IClientVehiclePort,
    @inject(IClientRuntimeBridge as any) private readonly runtime: IClientRuntimeBridge,
  ) {
    this.registerEventHandlers()
  }

  async createVehicle(
    options: Omit<VehicleCreateOptions, 'ownership'>,
  ): Promise<VehicleSpawnResult> {
    return new Promise((resolve) => {
      const requestId = this.requestIdCounter++
      this.pendingCreations.set(requestId, resolve)
      this.events.emit(SYSTEM_EVENTS.vehicle.create, { ...options, _requestId: requestId })
      setTimeout(() => {
        if (!this.pendingCreations.has(requestId)) return
        this.pendingCreations.delete(requestId)
        resolve({ networkId: 0, handle: 0, success: false, error: 'Request timeout' })
      }, 5000)
    })
  }

  async deleteVehicle(networkId: number): Promise<boolean> {
    return new Promise((resolve) => {
      this.pendingDeletes.set(networkId, resolve)
      this.events.emit(SYSTEM_EVENTS.vehicle.delete, networkId)
      setTimeout(() => {
        if (!this.pendingDeletes.has(networkId)) return
        this.pendingDeletes.delete(networkId)
        resolve(false)
      }, 5000)
    })
  }

  async repairVehicle(networkId: number): Promise<boolean> {
    return new Promise((resolve) => {
      this.pendingRepairs.set(networkId, resolve)
      this.events.emit(SYSTEM_EVENTS.vehicle.repair, networkId)
      setTimeout(() => {
        if (!this.pendingRepairs.has(networkId)) return
        this.pendingRepairs.delete(networkId)
        resolve(false)
      }, 5000)
    })
  }

  getClosestVehicle(radius = 10.0): number | null {
    return this.vehicles.getClosest(radius)
  }

  isPlayerInVehicle(): boolean {
    return this.vehicles.isLocalPlayerInVehicle()
  }

  getCurrentVehicle(): number | null {
    return this.vehicles.getCurrentForLocalPlayer()
  }

  getLastVehicle(): number | null {
    return this.vehicles.getLastForLocalPlayer()
  }

  isPlayerDriver(): boolean {
    const vehicle = this.getCurrentVehicle()
    if (!vehicle) return false
    return this.vehicles.isLocalPlayerDriver(vehicle)
  }

  getSpeed(vehicle: number): number {
    return this.vehicles.getSpeed(vehicle) * 3.6
  }

  getNetworkId(vehicle: number): number {
    return this.vehicles.getNetworkId(vehicle)
  }

  getVehicleFromNetworkId(networkId: number): number {
    return this.vehicles.getFromNetworkId(networkId)
  }

  getVehicleState<T = any>(vehicle: number, key: string): T | undefined {
    return this.vehicles.getState<T>(vehicle, key)
  }

  setDoorsLocked(networkId: number, locked: boolean): void {
    this.events.emit(SYSTEM_EVENTS.vehicle.setLocked, networkId, locked)
  }

  async getVehicleData(networkId: number): Promise<SerializedVehicleData | null> {
    return new Promise((resolve) => {
      this.pendingData.set(networkId, resolve)
      this.events.emit(SYSTEM_EVENTS.vehicle.getData, networkId)
      setTimeout(() => {
        if (!this.pendingData.has(networkId)) return
        this.pendingData.delete(networkId)
        resolve(null)
      }, 5000)
    })
  }

  async getPlayerVehicles(): Promise<SerializedVehicleData[]> {
    return new Promise((resolve) => {
      this.pendingPlayerVehicles = resolve
      this.events.emit(SYSTEM_EVENTS.vehicle.getPlayerVehicles)
      setTimeout(() => {
        if (!this.pendingPlayerVehicles) return
        this.pendingPlayerVehicles = null
        resolve([])
      }, 5000)
    })
  }

  warpIntoVehicle(vehicle: number, seatIndex: number = -1): void {
    this.vehicles.warpLocalPlayerInto(vehicle, seatIndex)
  }

  setHeading(vehicle: number, heading: number): void {
    this.vehicles.setHeading(vehicle, heading)
  }

  getPosition(vehicle: number): Vector3 | null {
    return this.vehicles.getPosition(vehicle)
  }

  getHeading(vehicle: number): number {
    return this.vehicles.getHeading(vehicle)
  }

  getModel(vehicle: number): number {
    return this.vehicles.getModel(vehicle)
  }

  getPlate(vehicle: number): string {
    return this.vehicles.getPlate(vehicle)
  }

  applyMods(vehicle: number, mods: Record<string, any>): void {
    this.vehicles.applyMods(vehicle, mods)
  }

  repair(vehicle: number): void {
    this.vehicles.repair(vehicle)
  }

  setFuel(vehicle: number, level: number): void {
    this.vehicles.setFuel(vehicle, level)
  }

  private registerEventHandlers(): void {
    this.events.on(
      SYSTEM_EVENTS.vehicle.createResult,
      (_ctx, result: VehicleSpawnResult & { _requestId?: number }) => {
        if (result._requestId === undefined) return
        const callback = this.pendingCreations.get(result._requestId)
        if (!callback) return
        callback(result)
        this.pendingCreations.delete(result._requestId)
      },
    )

    this.events.on(
      SYSTEM_EVENTS.vehicle.deleteResult,
      (_ctx, result: { networkId: number; success: boolean }) => {
        const callback = this.pendingDeletes.get(result.networkId)
        if (!callback) return
        callback(result.success)
        this.pendingDeletes.delete(result.networkId)
      },
    )

    this.events.on(
      SYSTEM_EVENTS.vehicle.repairResult,
      (_ctx, result: { networkId: number; success: boolean }) => {
        const callback = this.pendingRepairs.get(result.networkId)
        if (!callback) return
        callback(result.success)
        this.pendingRepairs.delete(result.networkId)
      },
    )

    this.events.on(SYSTEM_EVENTS.vehicle.dataResult, (_ctx, data: SerializedVehicleData | null) => {
      if (!data) return
      const callback = this.pendingData.get(data.networkId)
      if (!callback) return
      callback(data)
      this.pendingData.delete(data.networkId)
    })

    this.events.on(
      SYSTEM_EVENTS.vehicle.playerVehiclesResult,
      (_ctx, vehicles: SerializedVehicleData[]) => {
        this.pendingPlayerVehicles?.(vehicles)
        this.pendingPlayerVehicles = null
      },
    )

    this.events.on(SYSTEM_EVENTS.vehicle.created, async (_ctx, data: SerializedVehicleData) => {
      const veh = await this.waitForVehicle(data.networkId)
      if (!veh) return
      if (data.mods && Object.keys(data.mods).length > 0) this.applyMods(veh, data.mods)
      if (data.metadata?.fuel !== undefined) this.setFuel(veh, data.metadata.fuel)
    })

    this.events.on(
      SYSTEM_EVENTS.vehicle.modified,
      (_ctx, data: { networkId: number; mods: any }) => {
        const veh = this.getVehicleFromNetworkId(data.networkId)
        if (veh && this.vehicles.exists(veh)) this.applyMods(veh, data.mods)
      },
    )

    this.events.on(SYSTEM_EVENTS.vehicle.repaired, (_ctx, networkId: number) => {
      const veh = this.getVehicleFromNetworkId(networkId)
      if (veh && this.vehicles.exists(veh)) this.repair(veh)
    })

    this.events.on(
      SYSTEM_EVENTS.vehicle.warpInto,
      async (_ctx, networkId: number, seatIndex: number = -1) => {
        const veh = await this.waitForVehicle(networkId)
        if (veh) this.warpIntoVehicle(veh, seatIndex)
      },
    )
  }

  private async waitForVehicle(networkId: number): Promise<number | null> {
    const started = this.runtime.getGameTimer()
    while (this.runtime.getGameTimer() - started < 5000) {
      const veh = this.getVehicleFromNetworkId(networkId)
      if (veh && this.vehicles.exists(veh)) return veh
      await new Promise((r) => setTimeout(r, 0))
    }
    return null
  }
}
