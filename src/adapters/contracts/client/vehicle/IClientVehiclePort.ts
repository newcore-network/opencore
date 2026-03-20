import type { Vector3 } from '../../../../kernel/utils/vector3'

/**
 * High-level vehicle creation options understood by client adapters.
 */
export interface ClientVehicleSpawnOptions {
  model: string
  position: Vector3
  heading?: number
  placeOnGround?: boolean
  warpIntoVehicle?: boolean
  seatIndex?: number
  primaryColor?: number
  secondaryColor?: number
  plate?: string
  networked?: boolean
}

/**
 * Common vehicle modification payload used by the framework.
 */
export interface ClientVehicleMods {
  spoiler?: number
  frontBumper?: number
  rearBumper?: number
  sideSkirt?: number
  exhaust?: number
  frame?: number
  grille?: number
  hood?: number
  fender?: number
  rightFender?: number
  roof?: number
  engine?: number
  brakes?: number
  transmission?: number
  horns?: number
  suspension?: number
  armor?: number
  turbo?: boolean
  xenon?: boolean
  wheelType?: number
  wheels?: number
  windowTint?: number
  livery?: number
  plateStyle?: number
  neonEnabled?: [boolean, boolean, boolean, boolean]
  neonColor?: [number, number, number]
  extras?: Record<string, boolean>
  pearlescentColor?: number
  wheelColor?: number
}

/**
 * Intent-oriented client vehicle port.
 *
 * The framework requests vehicle operations through this port and the adapter
 * decides how to fulfill them for the active runtime.
 */
export abstract class IClientVehiclePort {
  /**
   * Spawns a vehicle and returns its runtime handle.
   */
  abstract spawn(options: ClientVehicleSpawnOptions): Promise<number>

  /**
   * Deletes an existing vehicle handle.
   */
  abstract delete(vehicle: number): void

  /**
   * Repairs a vehicle and restores it to a drivable state.
   */
  abstract repair(vehicle: number): void

  /**
   * Sets normalized fuel in the 0..1 range unless the adapter documents otherwise.
   */
  abstract setFuel(vehicle: number, level: number): void

  /**
   * Gets normalized fuel in the 0..1 range unless the adapter documents otherwise.
   */
  abstract getFuel(vehicle: number): number

  /**
   * Returns the closest vehicle around the local player.
   */
  abstract getClosest(radius?: number): number | null

  /**
   * Returns whether the local player is currently inside any vehicle.
   */
  abstract isLocalPlayerInVehicle(): boolean

  /**
   * Returns the vehicle currently occupied by the local player.
   */
  abstract getCurrentForLocalPlayer(): number | null

  /**
   * Returns the last vehicle used by the local player.
   */
  abstract getLastForLocalPlayer(): number | null

  /**
   * Returns whether the local player is driving the provided vehicle.
   */
  abstract isLocalPlayerDriver(vehicle: number): boolean

  /**
   * Warps the local player into a seat.
   */
  abstract warpLocalPlayerInto(vehicle: number, seatIndex?: number): void

  /**
   * Makes the local player leave the provided vehicle.
   */
  abstract leaveLocalPlayerVehicle(vehicle: number, flags?: number): void

  /**
   * Applies visual/performance modifications to a vehicle.
   */
  abstract applyMods(vehicle: number, mods: ClientVehicleMods): void

  /**
   * Updates door lock state.
   */
  abstract setDoorsLocked(vehicle: number, locked: boolean): void

  /**
   * Starts or stops the engine.
   */
  abstract setEngineRunning(vehicle: number, running: boolean, instant?: boolean): void

  /**
   * Sets invincibility state for the vehicle entity.
   */
  abstract setInvincible(vehicle: number, invincible: boolean): void

  /**
   * Returns speed in meters per second.
   */
  abstract getSpeed(vehicle: number): number

  /**
   * Sets heading for a vehicle.
   */
  abstract setHeading(vehicle: number, heading: number): void

  /**
   * Teleports a vehicle to a world position.
   */
  abstract teleport(vehicle: number, position: Vector3, heading?: number): void

  /**
   * Returns whether a vehicle handle exists.
   */
  abstract exists(vehicle: number): boolean

  /**
   * Resolves the runtime network identifier for a vehicle.
   */
  abstract getNetworkId(vehicle: number): number

  /**
   * Resolves a vehicle handle from a runtime network identifier.
   */
  abstract getFromNetworkId(networkId: number): number

  /**
   * Reads a runtime state bag/state entry from a vehicle.
   */
  abstract getState<T = unknown>(vehicle: number, key: string): T | undefined

  /**
   * Returns the world position of a vehicle.
   */
  abstract getPosition(vehicle: number): Vector3 | null

  /**
   * Returns the heading of a vehicle.
   */
  abstract getHeading(vehicle: number): number

  /**
   * Returns the model hash of a vehicle.
   */
  abstract getModel(vehicle: number): number

  /**
   * Returns the current number plate text.
   */
  abstract getPlate(vehicle: number): string
}
