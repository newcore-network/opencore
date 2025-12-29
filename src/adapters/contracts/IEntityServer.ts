import type { Vector3 } from '../../kernel/utils'

/**
 * Server-side entity operations adapter.
 *
 * @remarks
 * Abstracts FiveM entity natives for server-side operations.
 * Allows the runtime to work without direct FiveM dependencies.
 */
export abstract class IEntityServer {
  /**
   * Checks if an entity exists.
   */
  abstract doesExist(handle: number): boolean

  /**
   * Gets entity coordinates.
   */
  abstract getCoords(handle: number): Vector3

  /**
   * Sets entity coordinates.
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
   * Gets entity heading.
   */
  abstract getHeading(handle: number): number

  /**
   * Sets entity heading.
   */
  abstract setHeading(handle: number, heading: number): void

  /**
   * Gets entity model hash.
   */
  abstract getModel(handle: number): number

  /**
   * Deletes an entity.
   */
  abstract delete(handle: number): void

  /**
   * Sets entity orphan mode.
   * @param mode - 0 = delete when orphaned, 1 = keep, 2 = keep until script restart
   */
  abstract setOrphanMode(handle: number, mode: number): void

  /**
   * Sets entity routing bucket.
   */
  abstract setRoutingBucket(handle: number, bucket: number): void

  /**
   * Gets entity routing bucket.
   */
  abstract getRoutingBucket(handle: number): number

  /**
   * Gets the state bag interface for an entity.
   */
  abstract getStateBag(handle: number): EntityStateBag
}

/**
 * State bag interface for entity state synchronization.
 */
export interface EntityStateBag {
  /**
   * Sets a value in the state bag.
   * @param key - State key
   * @param value - Value to set
   * @param replicated - Whether to replicate to clients
   */
  set(key: string, value: unknown, replicated?: boolean): void

  /**
   * Gets a value from the state bag.
   * @param key - State key
   */
  get(key: string): unknown
}
