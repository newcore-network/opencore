import type { Vector3 } from '../../../../kernel/utils/vector3'

export interface ClientMarkerOptions {
  type: number
  position: Vector3
  rotation?: Vector3
  scale: Vector3
  color: { r: number; g: number; b: number; a: number }
  bobUpAndDown: boolean
  faceCamera: boolean
  rotate: boolean
  drawOnEnts: boolean
}

export abstract class IClientMarkerBridge {
  abstract draw(options: ClientMarkerOptions): void
}
