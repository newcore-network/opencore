import { Vector3 } from '../../kernel/utils'

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

  /**
   * Gets entity health from state bag.
   */
  abstract getHealth(handle: number): number

  /**
   * Sets entity health via state bag (synced to client).
   */
  abstract setHealth(handle: number, health: number): void

  /**
   * Gets entity armor from state bag.
   */
  abstract getArmor(handle: number): number

  /**
   * Sets entity armor via state bag (synced to client).
   */
  abstract setArmor(handle: number, armor: number): void
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
