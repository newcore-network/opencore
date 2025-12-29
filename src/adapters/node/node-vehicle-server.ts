import { injectable } from 'tsyringe'
import { IVehicleServer } from '../contracts/IVehicleServer'

/**
 * Node.js mock implementation of server-side vehicle operations.
 * Used for testing and standalone mode.
 */
@injectable()
export class NodeVehicleServer extends IVehicleServer {
  private vehicles = new Map<
    number,
    {
      model: number
      colors: [number, number]
      plate: string
      doorsLocked: number
      networkId: number
    }
  >()
  private nextHandle = 1000
  private nextNetworkId = 1

  createServerSetter(
    modelHash: number,
    _vehicleType: string,
    _x: number,
    _y: number,
    _z: number,
    _heading: number,
  ): number {
    const handle = this.nextHandle++
    const networkId = this.nextNetworkId++

    this.vehicles.set(handle, {
      model: modelHash,
      colors: [0, 0],
      plate: '',
      doorsLocked: 1,
      networkId,
    })

    return handle
  }

  getColours(handle: number): [number, number] {
    return this.vehicles.get(handle)?.colors ?? [0, 0]
  }

  setColours(handle: number, primary: number, secondary: number): void {
    const vehicle = this.vehicles.get(handle)
    if (vehicle) {
      vehicle.colors = [primary, secondary]
    }
  }

  getNumberPlateText(handle: number): string {
    return this.vehicles.get(handle)?.plate ?? ''
  }

  setNumberPlateText(handle: number, text: string): void {
    const vehicle = this.vehicles.get(handle)
    if (vehicle) {
      vehicle.plate = text.substring(0, 8)
    }
  }

  setDoorsLocked(handle: number, state: number): void {
    const vehicle = this.vehicles.get(handle)
    if (vehicle) {
      vehicle.doorsLocked = state
    }
  }

  getNetworkIdFromEntity(handle: number): number {
    return this.vehicles.get(handle)?.networkId ?? 0
  }

  getEntityFromNetworkId(networkId: number): number {
    for (const [handle, vehicle] of this.vehicles) {
      if (vehicle.networkId === networkId) {
        return handle
      }
    }
    return 0
  }

  networkIdExists(networkId: number): boolean {
    for (const vehicle of this.vehicles.values()) {
      if (vehicle.networkId === networkId) {
        return true
      }
    }
    return false
  }

  // Test helper: delete vehicle
  _deleteVehicle(handle: number): void {
    this.vehicles.delete(handle)
  }

  // Test helper: check if vehicle exists
  _vehicleExists(handle: number): boolean {
    return this.vehicles.has(handle)
  }
}
