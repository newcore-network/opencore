import { injectable } from 'tsyringe'
import { IVehicleServer } from '../contracts/IVehicleServer'

/**
 * FiveM implementation of server-side vehicle operations.
 */
@injectable()
export class FiveMVehicleServer extends IVehicleServer {
  createServerSetter(
    modelHash: number,
    vehicleType: string,
    x: number,
    y: number,
    z: number,
    heading: number,
  ): number {
    return CreateVehicleServerSetter(modelHash, vehicleType, x, y, z, heading)
  }

  getColours(handle: number): [number, number] {
    return GetVehicleColours(handle) as [number, number]
  }

  setColours(handle: number, primary: number, secondary: number): void {
    SetVehicleColours(handle, primary, secondary)
  }

  getNumberPlateText(handle: number): string {
    return GetVehicleNumberPlateText(handle)
  }

  setNumberPlateText(handle: number, text: string): void {
    SetVehicleNumberPlateText(handle, text)
  }

  setDoorsLocked(handle: number, state: number): void {
    SetVehicleDoorsLocked(handle, state)
  }

  getNetworkIdFromEntity(handle: number): number {
    return NetworkGetNetworkIdFromEntity(handle)
  }

  getEntityFromNetworkId(networkId: number): number {
    return NetworkGetEntityFromNetworkId(networkId)
  }

  networkIdExists(networkId: number): boolean {
    return NetworkDoesEntityExistWithNetworkId(networkId)
  }
}
