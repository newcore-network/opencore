import type { Vector3 } from '../../../../kernel/utils/vector3'

export interface ClientBlipOptions {
  sprite?: number
  color?: number
  scale?: number
  shortRange?: boolean
  label?: string
  display?: number
  category?: number
  flash?: boolean
  alpha?: number
  route?: boolean
  routeColor?: number
}

export abstract class IClientBlipBridge {
  abstract create(position: Vector3): number
  abstract createForEntity(entity: number): number
  abstract createForRadius(position: Vector3, radius: number): number
  abstract exists(handle: number): boolean
  abstract remove(handle: number): void
  abstract setPosition(handle: number, position: Vector3): void
  abstract applyOptions(handle: number, options: ClientBlipOptions): void
}
