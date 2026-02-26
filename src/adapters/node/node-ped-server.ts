import { injectable } from 'tsyringe'
import { IPedServer } from '../contracts/server/IPedServer'

/** Node.js mock implementation of server-side ped operations. */
@injectable()
export class NodePedServer extends IPedServer {
  private readonly byHandle = new Map<number, number>()
  private readonly byNetworkId = new Map<number, number>()
  private nextHandle = 2000
  private nextNetworkId = 5000

  create(
    _pedType: number,
    _modelHash: number,
    _x: number,
    _y: number,
    _z: number,
    _heading: number,
    networked: boolean,
  ): number {
    const handle = this.nextHandle++
    this.byHandle.set(handle, 0)

    if (networked) {
      const netId = this.nextNetworkId++
      this.byHandle.set(handle, netId)
      this.byNetworkId.set(netId, handle)
    }

    return handle
  }

  delete(handle: number): void {
    const netId = this.byHandle.get(handle)
    if (netId && netId > 0) {
      this.byNetworkId.delete(netId)
    }
    this.byHandle.delete(handle)
  }

  getNetworkIdFromEntity(handle: number): number {
    return this.byHandle.get(handle) ?? 0
  }

  getEntityFromNetworkId(networkId: number): number {
    return this.byNetworkId.get(networkId) ?? 0
  }

  networkIdExists(networkId: number): boolean {
    return this.byNetworkId.has(networkId)
  }
}
