import { inject, injectable } from 'tsyringe'
import { Vector3 } from '../../../kernel/utils/vector3'
import {
  type ClientVehicleMods as VehicleMods,
  type ClientVehicleSpawnOptions as VehicleSpawnOptions,
  IClientVehiclePort,
} from '../../../adapters/contracts/client/vehicle/IClientVehiclePort'

export type { VehicleSpawnOptions, VehicleMods }

@injectable()
export class VehicleService {
  constructor(@inject(IClientVehiclePort as any) private readonly vehicles: IClientVehiclePort) {}

  async spawn(options: VehicleSpawnOptions): Promise<number> {
    return this.vehicles.spawn(options)
  }

  delete(vehicle: number): void {
    this.vehicles.delete(vehicle)
  }

  deleteCurrentVehicle(): void {
    const vehicle = this.getCurrentVehicle()
    if (vehicle) {
      this.vehicles.leaveLocalPlayerVehicle(vehicle, 16)
      setTimeout(() => this.delete(vehicle), 1000)
    }
  }

  repair(vehicle: number): void {
    this.vehicles.repair(vehicle)
  }

  setFuel(vehicle: number, level: number): void {
    this.vehicles.setFuel(vehicle, level)
  }

  getFuel(vehicle: number): number {
    return this.vehicles.getFuel(vehicle)
  }

  getClosest(radius = 10.0): number | null {
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

  setMods(vehicle: number, mods: VehicleMods): void {
    this.vehicles.applyMods(vehicle, mods)
  }

  setDoorsLocked(vehicle: number, locked: boolean): void {
    this.vehicles.setDoorsLocked(vehicle, locked)
  }

  setEngineRunning(vehicle: number, running: boolean, instant = false): void {
    this.vehicles.setEngineRunning(vehicle, running, instant)
  }

  setInvincible(vehicle: number, invincible: boolean): void {
    this.vehicles.setInvincible(vehicle, invincible)
  }

  getSpeed(vehicle: number): number {
    return this.vehicles.getSpeed(vehicle) * 3.6
  }

  setHeading(vehicle: number, heading: number): void {
    this.vehicles.setHeading(vehicle, heading)
  }

  teleport(vehicle: number, position: Vector3, heading?: number): void {
    this.vehicles.teleport(vehicle, position, heading)
  }
}
