import { Vector3 } from '@open-core/framework'

export interface Spatial {
  getPosition(): Vector3
  setPosition(v: Vector3): void
}
