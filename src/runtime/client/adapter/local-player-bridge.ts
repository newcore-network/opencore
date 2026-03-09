import { Vector3 } from '../../../kernel/utils/vector3'

/**
 * Minimal local player operations used by client core.
 */
export abstract class IClientLocalPlayerBridge {
  abstract setPosition(position: Vector3, heading?: number): void
}
