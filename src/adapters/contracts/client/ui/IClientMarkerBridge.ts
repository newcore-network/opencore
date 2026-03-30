import type { Vector3 } from '../../../../kernel/utils/vector3'

export interface ClientMarkerOptions {
  variant?: number
  type?: number
  size?: Vector3
  scale?: Vector3
  visible?: boolean
  bob?: boolean
  bobUpAndDown?: boolean
  faceCamera?: boolean
  rotate?: boolean
  drawOnEnts?: boolean
  color?: { r: number; g: number; b: number; a: number }
}

export interface ClientMarkerDefinition extends ClientMarkerOptions {
  position: Vector3
  rotation?: Vector3
}

export abstract class IClientMarkerBridge {
  abstract create(id: string, definition: ClientMarkerDefinition): void
  abstract update(id: string, patch: Partial<ClientMarkerDefinition>): boolean
  abstract remove(id: string): boolean
  abstract exists(id: string): boolean
  abstract clear(): void
  abstract draw(definition: ClientMarkerDefinition): void
}
