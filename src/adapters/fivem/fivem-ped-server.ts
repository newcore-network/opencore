import { injectable } from 'tsyringe'
import { IPedServer } from '../contracts/server/IPedServer'

/** FiveM implementation of server-side ped operations. */
@injectable()
export class FiveMPedServer extends IPedServer {
  create(
    pedType: number,
    modelHash: number,
    x: number,
    y: number,
    z: number,
    heading: number,
    networked: boolean,
  ): number {
    return CreatePed(pedType, modelHash, x, y, z, heading, networked, true)
  }

  delete(handle: number): void {
    DeleteEntity(handle)
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
