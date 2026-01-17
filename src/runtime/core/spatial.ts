import { Vector3 } from '../../kernel/utils/vector3'

export interface Spatial {
  getPosition(): Vector3
  setPosition(v: Vector3): void
}
