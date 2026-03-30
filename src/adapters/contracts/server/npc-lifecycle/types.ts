import type { Vector3 } from '../../../../kernel/utils/vector3'

export interface CreateNpcServerRequest {
  model: string
  modelHash: number
  position: Vector3
  heading: number
  networked: boolean
  routingBucket?: number
  persistent?: boolean
}

export interface CreateNpcServerResult {
  handle: number
  netId?: number
}

export interface DeleteNpcServerRequest {
  handle: number
}
