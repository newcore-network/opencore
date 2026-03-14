import type {
  CreateVehicleServerRequest,
  CreateVehicleServerResult,
  WarpPlayerIntoVehicleRequest,
} from './types'

export abstract class IVehicleLifecycleServer {
  abstract create(
    request: CreateVehicleServerRequest,
  ): Promise<CreateVehicleServerResult> | CreateVehicleServerResult
  abstract warpPlayerIntoVehicle(request: WarpPlayerIntoVehicleRequest): Promise<void> | void
}
