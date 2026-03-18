import type { Vector3 } from '../../../kernel/utils/vector3'

export abstract class IClientLocalPlayerBridge {
  abstract setPosition(position: Vector3, heading?: number): void
}
