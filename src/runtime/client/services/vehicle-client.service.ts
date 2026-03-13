import { inject, injectable } from 'tsyringe'
import { EventsAPI } from '../../../adapters/contracts/transport/events.api'
import { Vector3 } from '../../../kernel/utils/vector3'
import { IClientPlatformBridge } from '../adapter/platform-bridge'
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
    @inject(IClientPlatformBridge as any) private readonly platform: IClientPlatformBridge,
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
      this.events.emit('opencore:vehicle:create', { ...options, _requestId: requestId })
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
      this.events.emit('opencore:vehicle:delete', networkId)
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
      this.events.emit('opencore:vehicle:repair', networkId)
      setTimeout(() => {
        if (!this.pendingRepairs.has(networkId)) return
        this.pendingRepairs.delete(networkId)
        resolve(false)
      }, 5000)
    })
  }

  getClosestVehicle(radius = 10.0): number | null {
    const playerPed = this.platform.getLocalPlayerPed()
    return this.platform.getClosestVehicle(this.platform.getEntityCoords(playerPed), radius)
  }

  isPlayerInVehicle(): boolean {
    return this.platform.isPedInAnyVehicle(this.platform.getLocalPlayerPed())
  }

  getCurrentVehicle(): number | null {
    const ped = this.platform.getLocalPlayerPed()
    if (!this.platform.isPedInAnyVehicle(ped)) return null
    return this.platform.getVehiclePedIsIn(ped, false)
  }

  getLastVehicle(): number | null {
    return this.platform.getVehiclePedIsIn(this.platform.getLocalPlayerPed(), true)
  }

  isPlayerDriver(): boolean {
    const vehicle = this.getCurrentVehicle()
    if (!vehicle) return false
    return this.platform.getPedInVehicleSeat(vehicle, -1) === this.platform.getLocalPlayerPed()
  }

  getSpeed(vehicle: number): number {
    if (!this.platform.doesEntityExist(vehicle)) return 0
    return this.platform.getEntitySpeed(vehicle) * 3.6
  }

  getNetworkId(vehicle: number): number {
    if (!this.platform.doesEntityExist(vehicle)) return 0
    return this.platform.networkGetNetworkIdFromEntity(vehicle)
  }

  getVehicleFromNetworkId(networkId: number): number {
    if (!this.platform.networkDoesEntityExistWithNetworkId(networkId)) return 0
    return this.platform.networkGetEntityFromNetworkId(networkId)
  }

  getVehicleState<T = any>(vehicle: number, key: string): T | undefined {
    if (!this.platform.doesEntityExist(vehicle)) return undefined
    return this.platform.getEntityState<T>(vehicle, key)
  }

  setDoorsLocked(networkId: number, locked: boolean): void {
    this.events.emit('opencore:vehicle:setLocked', networkId, locked)
  }

  async getVehicleData(networkId: number): Promise<SerializedVehicleData | null> {
    return new Promise((resolve) => {
      this.pendingData.set(networkId, resolve)
      this.events.emit('opencore:vehicle:getData', networkId)
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
      this.events.emit('opencore:vehicle:getPlayerVehicles')
      setTimeout(() => {
        if (!this.pendingPlayerVehicles) return
        this.pendingPlayerVehicles = null
        resolve([])
      }, 5000)
    })
  }

  warpIntoVehicle(vehicle: number, seatIndex: number = -1): void {
    if (!this.platform.doesEntityExist(vehicle)) return
    this.platform.taskWarpPedIntoVehicle(this.platform.getLocalPlayerPed(), vehicle, seatIndex)
  }

  setHeading(vehicle: number, heading: number): void {
    if (!this.platform.doesEntityExist(vehicle)) return
    this.platform.setEntityHeading(vehicle, heading)
  }

  getPosition(vehicle: number): Vector3 | null {
    if (!this.platform.doesEntityExist(vehicle)) return null
    return this.platform.getEntityCoords(vehicle)
  }

  getHeading(vehicle: number): number {
    if (!this.platform.doesEntityExist(vehicle)) return 0
    return this.platform.getEntityHeading(vehicle)
  }

  getModel(vehicle: number): number {
    if (!this.platform.doesEntityExist(vehicle)) return 0
    return this.platform.getEntityModel(vehicle)
  }

  getPlate(vehicle: number): string {
    if (!this.platform.doesEntityExist(vehicle)) return ''
    return this.platform.getVehicleNumberPlateText(vehicle)
  }

  applyMods(vehicle: number, mods: Record<string, any>): void {
    if (!this.platform.doesEntityExist(vehicle)) return
    this.platform.setVehicleModKit(vehicle, 0)
    if (mods.spoiler !== undefined) this.platform.setVehicleMod(vehicle, 0, mods.spoiler, false)
    if (mods.frontBumper !== undefined)
      this.platform.setVehicleMod(vehicle, 1, mods.frontBumper, false)
    if (mods.rearBumper !== undefined)
      this.platform.setVehicleMod(vehicle, 2, mods.rearBumper, false)
    if (mods.sideSkirt !== undefined) this.platform.setVehicleMod(vehicle, 3, mods.sideSkirt, false)
    if (mods.exhaust !== undefined) this.platform.setVehicleMod(vehicle, 4, mods.exhaust, false)
    if (mods.frame !== undefined) this.platform.setVehicleMod(vehicle, 5, mods.frame, false)
    if (mods.grille !== undefined) this.platform.setVehicleMod(vehicle, 6, mods.grille, false)
    if (mods.hood !== undefined) this.platform.setVehicleMod(vehicle, 7, mods.hood, false)
    if (mods.fender !== undefined) this.platform.setVehicleMod(vehicle, 8, mods.fender, false)
    if (mods.rightFender !== undefined)
      this.platform.setVehicleMod(vehicle, 9, mods.rightFender, false)
    if (mods.roof !== undefined) this.platform.setVehicleMod(vehicle, 10, mods.roof, false)
    if (mods.engine !== undefined) this.platform.setVehicleMod(vehicle, 11, mods.engine, false)
    if (mods.brakes !== undefined) this.platform.setVehicleMod(vehicle, 12, mods.brakes, false)
    if (mods.transmission !== undefined)
      this.platform.setVehicleMod(vehicle, 13, mods.transmission, false)
    if (mods.horns !== undefined) this.platform.setVehicleMod(vehicle, 14, mods.horns, false)
    if (mods.suspension !== undefined)
      this.platform.setVehicleMod(vehicle, 15, mods.suspension, false)
    if (mods.armor !== undefined) this.platform.setVehicleMod(vehicle, 16, mods.armor, false)
    if (mods.turbo !== undefined) this.platform.toggleVehicleMod(vehicle, 18, mods.turbo)
    if (mods.xenon !== undefined) this.platform.toggleVehicleMod(vehicle, 22, mods.xenon)
    if (mods.wheelType !== undefined) this.platform.setVehicleWheelType(vehicle, mods.wheelType)
    if (mods.wheels !== undefined) this.platform.setVehicleMod(vehicle, 23, mods.wheels, false)
    if (mods.windowTint !== undefined) this.platform.setVehicleWindowTint(vehicle, mods.windowTint)
    if (mods.livery !== undefined) this.platform.setVehicleLivery(vehicle, mods.livery)
    if (mods.plateStyle !== undefined)
      this.platform.setVehicleNumberPlateTextIndex(vehicle, mods.plateStyle)
    if (mods.neonEnabled !== undefined) {
      this.platform.setVehicleNeonLightEnabled(vehicle, 0, mods.neonEnabled[0])
      this.platform.setVehicleNeonLightEnabled(vehicle, 1, mods.neonEnabled[1])
      this.platform.setVehicleNeonLightEnabled(vehicle, 2, mods.neonEnabled[2])
      this.platform.setVehicleNeonLightEnabled(vehicle, 3, mods.neonEnabled[3])
    }
    if (mods.neonColor !== undefined) {
      this.platform.setVehicleNeonLightsColour(
        vehicle,
        mods.neonColor[0],
        mods.neonColor[1],
        mods.neonColor[2],
      )
    }
    if (mods.extras) {
      for (const [extraId, enabled] of Object.entries(mods.extras)) {
        this.platform.setVehicleExtra(vehicle, Number(extraId), !enabled)
      }
    }
    if (mods.pearlescentColor !== undefined || mods.wheelColor !== undefined) {
      const [currentPearl, currentWheel] = this.platform.getVehicleExtraColours(vehicle)
      this.platform.setVehicleExtraColours(
        vehicle,
        mods.pearlescentColor ?? currentPearl,
        mods.wheelColor ?? currentWheel,
      )
    }
  }

  repair(vehicle: number): void {
    if (!this.platform.doesEntityExist(vehicle)) return
    this.platform.setVehicleFixed(vehicle)
    this.platform.setVehicleDeformationFixed(vehicle)
    this.platform.setVehicleUndriveable(vehicle, false)
    this.platform.setVehicleEngineOn(vehicle, true, true, false)
    this.platform.setVehicleEngineHealth(vehicle, 1000.0)
    this.platform.setVehiclePetrolTankHealth(vehicle, 1000.0)
  }

  setFuel(vehicle: number, level: number): void {
    if (!this.platform.doesEntityExist(vehicle)) return
    this.platform.setVehicleFuelLevel(vehicle, Math.max(0, Math.min(100, level)))
  }

  private registerEventHandlers(): void {
    this.events.on(
      'opencore:vehicle:createResult',
      (_ctx, result: VehicleSpawnResult & { _requestId?: number }) => {
        if (result._requestId === undefined) return
        const callback = this.pendingCreations.get(result._requestId)
        if (!callback) return
        callback(result)
        this.pendingCreations.delete(result._requestId)
      },
    )

    this.events.on(
      'opencore:vehicle:deleteResult',
      (_ctx, result: { networkId: number; success: boolean }) => {
        const callback = this.pendingDeletes.get(result.networkId)
        if (!callback) return
        callback(result.success)
        this.pendingDeletes.delete(result.networkId)
      },
    )

    this.events.on(
      'opencore:vehicle:repairResult',
      (_ctx, result: { networkId: number; success: boolean }) => {
        const callback = this.pendingRepairs.get(result.networkId)
        if (!callback) return
        callback(result.success)
        this.pendingRepairs.delete(result.networkId)
      },
    )

    this.events.on('opencore:vehicle:dataResult', (_ctx, data: SerializedVehicleData | null) => {
      if (!data) return
      const callback = this.pendingData.get(data.networkId)
      if (!callback) return
      callback(data)
      this.pendingData.delete(data.networkId)
    })

    this.events.on(
      'opencore:vehicle:playerVehiclesResult',
      (_ctx, vehicles: SerializedVehicleData[]) => {
        this.pendingPlayerVehicles?.(vehicles)
        this.pendingPlayerVehicles = null
      },
    )

    this.events.on('opencore:vehicle:created', async (_ctx, data: SerializedVehicleData) => {
      const veh = await this.waitForVehicle(data.networkId)
      if (!veh) return
      if (data.mods && Object.keys(data.mods).length > 0) this.applyMods(veh, data.mods)
      if (data.metadata?.fuel !== undefined) this.setFuel(veh, data.metadata.fuel)
    })

    this.events.on('opencore:vehicle:modified', (_ctx, data: { networkId: number; mods: any }) => {
      const veh = this.getVehicleFromNetworkId(data.networkId)
      if (veh && this.platform.doesEntityExist(veh)) this.applyMods(veh, data.mods)
    })

    this.events.on('opencore:vehicle:repaired', (_ctx, networkId: number) => {
      const veh = this.getVehicleFromNetworkId(networkId)
      if (veh && this.platform.doesEntityExist(veh)) this.repair(veh)
    })

    this.events.on(
      'opencore:vehicle:warpInto',
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
      if (veh && this.platform.doesEntityExist(veh)) return veh
      await new Promise((r) => setTimeout(r, 0))
    }
    return null
  }
}
