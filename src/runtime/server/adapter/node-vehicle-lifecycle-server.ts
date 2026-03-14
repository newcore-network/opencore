import { inject, injectable } from 'tsyringe'
import { IVehicleLifecycleServer } from '../../../adapters/contracts/server/vehicle-lifecycle/IVehicleLifecycleServer'
import type {
  CreateVehicleServerRequest,
  CreateVehicleServerResult,
  WarpPlayerIntoVehicleRequest,
} from '../../../adapters/contracts/server/vehicle-lifecycle/types'
import { IPlatformContext } from '../../../adapters/contracts/IPlatformContext'
import { IVehicleServer } from '../../../adapters/contracts/server/IVehicleServer'
import { EventsAPI } from '../../../adapters/contracts/transport/events.api'

@injectable()
export class NodeVehicleLifecycleServer extends IVehicleLifecycleServer {
  constructor(
    @inject(IVehicleServer as any) private readonly vehicleServer: IVehicleServer,
    @inject(IPlatformContext as any) private readonly platformContext: IPlatformContext,
    @inject(EventsAPI as any) private readonly events: EventsAPI<'server'>,
  ) {
    super()
  }

  create(request: CreateVehicleServerRequest): CreateVehicleServerResult {
    if (!this.platformContext.enableServerVehicleCreation) {
      throw new Error(
        `Server vehicle creation is disabled for profile '${this.platformContext.gameProfile}'`,
      )
    }

    const handle = this.vehicleServer.createServerSetter(
      request.modelHash,
      this.platformContext.defaultVehicleType,
      request.position.x,
      request.position.y,
      request.position.z,
      request.heading,
    )

    if (!handle || handle === 0) {
      throw new Error('Failed to create vehicle entity')
    }

    return {
      handle,
      networkId: this.vehicleServer.getNetworkIdFromEntity(handle),
    }
  }

  warpPlayerIntoVehicle(request: WarpPlayerIntoVehicleRequest): void {
    const clientId = Number(request.playerSrc)
    if (Number.isNaN(clientId)) return
    this.events.emit('opencore:vehicle:warpInto', clientId, request.networkId, request.seatIndex)
  }
}
