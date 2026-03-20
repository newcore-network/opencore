import type { Vector3 } from '../../../../kernel/utils/vector3'

/**
 * High-level options for spawning a ped.
 */
export interface ClientPedSpawnOptions {
  model: string
  position: Vector3
  heading?: number
  networked?: boolean
  missionEntity?: boolean
  relationshipGroup?: string
  blockEvents?: boolean
}

/**
 * High-level animation request for a ped.
 */
export interface ClientPedAnimationOptions {
  dict: string
  anim: string
  blendInSpeed?: number
  blendOutSpeed?: number
  duration?: number
  flags?: number
  playbackRate?: number
}

/**
 * Intent-oriented client ped port.
 */
export abstract class IClientPedPort {
  /** Spawns a ped and returns its runtime handle. */
  abstract spawn(options: ClientPedSpawnOptions): Promise<number>
  /** Deletes a ped handle if it exists. */
  abstract delete(handle: number): void
  /** Returns whether a ped handle exists. */
  abstract exists(handle: number): boolean
  /** Plays an animation on a ped. */
  abstract playAnimation(handle: number, options: ClientPedAnimationOptions): Promise<void>
  /** Stops the current animation/task on a ped. */
  abstract stopAnimation(handle: number): void
  /** Stops the current animation/task immediately on a ped. */
  abstract stopAnimationImmediately(handle: number): void
  /** Freezes or unfreezes a ped. */
  abstract freeze(handle: number, freeze: boolean): void
  /** Sets invincibility for a ped. */
  abstract setInvincible(handle: number, invincible: boolean): void
  /** Gives a weapon to a ped. */
  abstract giveWeapon(
    handle: number,
    weapon: string,
    ammo?: number,
    hidden?: boolean,
    forceInHand?: boolean,
  ): void
  /** Removes all weapons from a ped. */
  abstract removeAllWeapons(handle: number): void
  /** Returns the closest ped to the local player. */
  abstract getClosest(radius?: number, excludeLocalPlayer?: boolean): number | null
  /** Returns nearby ped handles. */
  abstract getNearby(position: Vector3, radius: number, excludeEntity?: number): number[]
  /** Makes a ped look at an entity. */
  abstract lookAtEntity(handle: number, entity: number, duration?: number): void
  /** Makes a ped look at coordinates. */
  abstract lookAtCoords(handle: number, position: Vector3, duration?: number): void
  /** Makes a ped walk to coordinates. */
  abstract walkTo(handle: number, position: Vector3, speed?: number): void
  /** Sets basic combat intent flags for a ped. */
  abstract setCombatAttributes(handle: number, canFight: boolean, canUseCover?: boolean): void
}
