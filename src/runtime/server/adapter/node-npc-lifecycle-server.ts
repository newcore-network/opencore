import { inject, injectable } from 'tsyringe'
import { IEntityServer } from '../../../adapters/contracts/server/IEntityServer'
import { INpcLifecycleServer } from '../../../adapters/contracts/server/npc-lifecycle/INpcLifecycleServer'
import type {
  CreateNpcServerRequest,
  CreateNpcServerResult,
  DeleteNpcServerRequest,
} from '../../../adapters/contracts/server/npc-lifecycle/types'
import { IPedServer } from '../../../adapters/contracts/server/IPedServer'

@injectable()
export class NodeNpcLifecycleServer extends INpcLifecycleServer {
  constructor(
    @inject(IPedServer as any) private readonly pedServer: IPedServer,
    @inject(IEntityServer as any) private readonly entityServer: IEntityServer,
  ) {
    super()
  }

  create(request: CreateNpcServerRequest): CreateNpcServerResult {
    const handle = this.pedServer.create(
      4,
      request.modelHash,
      request.position.x,
      request.position.y,
      request.position.z,
      request.heading,
      request.networked,
    )

    if (!handle || handle <= 0) {
      throw new Error('Failed to create NPC ped entity')
    }

    return {
      handle,
      netId: request.networked ? this.resolveNetId(handle) : undefined,
    }
  }

  delete(request: DeleteNpcServerRequest): void {
    if (!this.entityServer.doesExist(request.handle)) return
    this.pedServer.delete(request.handle)
  }

  private resolveNetId(handle: number): number | undefined {
    const netId = this.pedServer.getNetworkIdFromEntity(handle)
    return netId > 0 ? netId : undefined
  }
}
