import type { Vector3 } from '../../../kernel/utils/vector3'

/**
 * Port describing the local player from the client perspective.
 *
 * Adapters expose the local player's handle and spatial context so framework
 * services do not need to reach into low-level platform primitives.
 */
export abstract class IClientLocalPlayerBridge {
  /**
   * Returns the current runtime handle for the local player entity.
   */
  abstract getHandle(): number

  /**
   * Returns the current world position for the local player.
   */
  abstract getPosition(): Vector3

  /**
   * Returns the current heading for the local player.
   */
  abstract getHeading(): number

  /**
   * Moves the local player to a new position and optional heading.
   */
  abstract setPosition(position: Vector3, heading?: number): void
}
