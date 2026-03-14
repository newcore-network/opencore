import type { Vector3 } from '../../../../kernel/utils/vector3'

export interface CreateVehicleServerRequest {
  model: string
  modelHash: number
  position: Vector3
  heading: number
}

export interface CreateVehicleServerResult {
  handle: number
  networkId: number
}

export interface WarpPlayerIntoVehicleRequest {
  playerSrc: string
  networkId: number
  seatIndex: number
}
