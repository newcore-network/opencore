import { Vector3 } from '@open-core/framework'

/**
 * Options for setting entity position.
 *
 * @remarks
 * Platform-specific options can be passed via the `platformOptions` field.
 * Each platform adapter interprets these options according to its capabilities.
 */
export interface SetPositionOptions {
  /**
   * Whether to keep the entity alive during teleport.
   * @default false
   */
  keepAlive?: boolean

  /**
   * Whether to clear the area around the new position.
   * @default true
   */
  clearArea?: boolean

  /**
   * Platform-specific options.
   * @example { ragdollFlag: false, deadFlag: false } for FiveM
   */
  platformOptions?: Record<string, unknown>
}

/**
 * Server-side entity operations adapter.
 *
 * @remarks
 * Abstracts entity natives for server-side operations across different platforms.
 * Allows the runtime to work without direct platform dependencies.
 */
export abstract class IEntityServer {
  /**
   * Checks if an entity exists.
   * @param handle - Entity handle
   */
  abstract doesExist(handle: number): boolean

  /**
   * Gets entity coordinates.
   * @param handle - Entity handle
   */
  abstract getCoords(handle: number): Vector3

  /**
   * Sets entity coordinates using the new simplified API.
   *
   * @param handle - Entity handle
   * @param position - Target position
   * @param options - Optional positioning options
   */
  abstract setPosition(handle: number, position: Vector3, options?: SetPositionOptions): void

  /**
   * Sets entity coordinates.
   *
   * @deprecated Use setPosition() instead for cross-platform compatibility.
   * This method is kept for backward compatibility and FiveM-specific use cases.
   *
   * @param handle - Entity handle
   * @param x - X coordinate
   * @param y - Y coordinate
   * @param z - Z coordinate
   * @param alive - Keep alive flag (FiveM specific)
   * @param deadFlag - Dead flag (FiveM specific)
   * @param ragdollFlag - Ragdoll flag (FiveM specific)
   * @param clearArea - Clear area flag
   */
  abstract setCoords(
    handle: number,
    x: number,
    y: number,
    z: number,
    alive?: boolean,
    deadFlag?: boolean,
    ragdollFlag?: boolean,
    clearArea?: boolean,
  ): void

  /**
   * Gets entity heading (rotation on Z axis).
   * @param handle - Entity handle
   */
  abstract getHeading(handle: number): number

  /**
   * Sets entity heading (rotation on Z axis).
   * @param handle - Entity handle
   * @param heading - Heading in degrees (0-360)
   */
  abstract setHeading(handle: number, heading: number): void

  /**
   * Gets entity model hash.
   * @param handle - Entity handle
   */
  abstract getModel(handle: number): number

  /**
   * Deletes an entity.
   * @param handle - Entity handle
   */
  abstract delete(handle: number): void

  /**
   * Sets entity orphan mode (what happens when script stops).
   *
   * @param handle - Entity handle
   * @param mode - Orphan mode (platform-specific values)
   *   - FiveM: 0 = delete, 1 = keep, 2 = keep until restart
   */
  abstract setOrphanMode(handle: number, mode: number): void

  /**
   * Sets entity routing bucket (virtual world/dimension).
   *
   * @remarks
   * Not all platforms support routing buckets.
   * Use IPlatformCapabilities.supportsRoutingBuckets to check support.
   *
   * @param handle - Entity handle
   * @param bucket - Routing bucket ID
   */
  abstract setRoutingBucket(handle: number, bucket: number): void

  /**
   * Gets entity routing bucket (virtual world/dimension).
   * @param handle - Entity handle
   * @returns Routing bucket ID (0 is default world)
   */
  abstract getRoutingBucket(handle: number): number

  /**
   * Gets the state bag interface for an entity.
   *
   * @remarks
   * Not all platforms support state bags.
   * Use IPlatformCapabilities.supportsStateBags to check support.
   *
   * @param handle - Entity handle
   */
  abstract getStateBag(handle: number): EntityStateBag

  /**
   * Gets entity health.
   * @param handle - Entity handle
   * @returns Health value (platform-specific range)
   */
  abstract getHealth(handle: number): number

  /**
   * Sets entity health.
   * @param handle - Entity handle
   * @param health - Health value
   */
  abstract setHealth(handle: number, health: number): void

  /**
   * Gets entity armor.
   * @param handle - Entity handle
   * @returns Armor value (typically 0-100)
   */
  abstract getArmor(handle: number): number

  /**
   * Sets entity armor.
   * @param handle - Entity handle
   * @param armor - Armor value
   */
  abstract setArmor(handle: number, armor: number): void

  /**
   * Gets entity dimension (alias for getRoutingBucket).
   *
   * @remarks
   * This is a cross-platform alias. Some platforms call it "dimension",
   * others call it "routing bucket" or "virtual world".
   *
   * @param handle - Entity handle
   * @returns Dimension ID
   */
  getDimension(handle: number): number {
    return this.getRoutingBucket(handle)
  }

  /**
   * Sets entity dimension (alias for setRoutingBucket).
   *
   * @remarks
   * This is a cross-platform alias. Some platforms call it "dimension",
   * others call it "routing bucket" or "virtual world".
   *
   * @param handle - Entity handle
   * @param dimension - Dimension ID
   */
  setDimension(handle: number, dimension: number): void {
    this.setRoutingBucket(handle, dimension)
  }
}

/**
 * State bag interface for entity state synchronization.
 */
export interface EntityStateBag {
  /**
   * Sets a value in the state bag.
   *
   * @param key - State key
   * @param value - Value to set
   * @param replicated - Whether to replicate to clients (default: true)
   */
  set(key: string, value: unknown, replicated?: boolean): void

  /**
   * Gets a value from the state bag.
   * @param key - State key
   */
  get(key: string): unknown
}
