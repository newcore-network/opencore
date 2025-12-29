import { injectable } from 'tsyringe'
import type { Vector3 } from '../../../kernel/utils'

export interface VehicleSpawnOptions {
  /** Model name or hash */
  model: string
  /** Spawn position */
  position: Vector3
  /** Heading/rotation */
  heading?: number
  /** Whether to place on ground */
  placeOnGround?: boolean
  /** Whether to warp the player into the vehicle */
  warpIntoVehicle?: boolean
  /** Seat index to warp into (-1 = driver) */
  seatIndex?: number
  /** Primary color */
  primaryColor?: number
  /** Secondary color */
  secondaryColor?: number
  /** License plate text */
  plate?: string
  /** Network the vehicle */
  networked?: boolean
}

export interface VehicleMods {
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
}

/**
 * Service for vehicle operations and management.
 */
@injectable()
export class VehicleService {
  /**
   * Spawn a vehicle at a position.
   *
   * @param options - Spawn options
   * @returns The vehicle handle
   */
  async spawn(options: VehicleSpawnOptions): Promise<number> {
    const {
      model,
      position,
      heading = 0,
      placeOnGround = true,
      warpIntoVehicle = false,
      seatIndex = -1,
      primaryColor,
      secondaryColor,
      plate,
      networked = true,
    } = options

    const modelHash = GetHashKey(model)

    // Load the model
    if (!IsModelInCdimage(modelHash) || !IsModelAVehicle(modelHash)) {
      throw new Error(`Invalid vehicle model: ${model}`)
    }

    RequestModel(modelHash)
    while (!HasModelLoaded(modelHash)) {
      await new Promise((r) => setTimeout(r, 0))
    }

    // Create the vehicle
    const vehicle = CreateVehicle(
      modelHash,
      position.x,
      position.y,
      position.z,
      heading,
      networked,
      false,
    )

    SetModelAsNoLongerNeeded(modelHash)

    if (!vehicle || vehicle === 0) {
      throw new Error('Failed to create vehicle')
    }

    // Place on ground
    if (placeOnGround) {
      SetVehicleOnGroundProperly(vehicle)
    }

    // Set colors
    if (primaryColor !== undefined || secondaryColor !== undefined) {
      const [currentPrimary, currentSecondary] = GetVehicleColours(vehicle)
      SetVehicleColours(vehicle, primaryColor ?? currentPrimary, secondaryColor ?? currentSecondary)
    }

    // Set plate
    if (plate) {
      SetVehicleNumberPlateText(vehicle, plate)
    }

    // Warp player into vehicle
    if (warpIntoVehicle) {
      TaskWarpPedIntoVehicle(PlayerPedId(), vehicle, seatIndex)
    }

    return vehicle
  }

  /**
   * Delete a vehicle.
   *
   * @param vehicle - Vehicle handle
   */
  delete(vehicle: number): void {
    if (DoesEntityExist(vehicle)) {
      SetEntityAsMissionEntity(vehicle, true, true)
      DeleteVehicle(vehicle)
    }
  }

  /**
   * Delete the vehicle the player is currently in.
   */
  deleteCurrentVehicle(): void {
    const vehicle = this.getCurrentVehicle()
    if (vehicle) {
      TaskLeaveVehicle(PlayerPedId(), vehicle, 16)
      setTimeout(() => this.delete(vehicle), 1000)
    }
  }

  /**
   * Repair a vehicle completely.
   *
   * @param vehicle - Vehicle handle
   */
  repair(vehicle: number): void {
    if (!DoesEntityExist(vehicle)) return

    SetVehicleFixed(vehicle)
    SetVehicleDeformationFixed(vehicle)
    SetVehicleUndriveable(vehicle, false)
    SetVehicleEngineOn(vehicle, true, true, false)
    SetVehicleEngineHealth(vehicle, 1000.0)
    SetVehiclePetrolTankHealth(vehicle, 1000.0)
  }

  /**
   * Set vehicle fuel level.
   *
   * @param vehicle - Vehicle handle
   * @param level - Fuel level (0.0-100.0)
   */
  setFuel(vehicle: number, level: number): void {
    if (!DoesEntityExist(vehicle)) return
    SetVehicleFuelLevel(vehicle, Math.max(0, Math.min(100, level * 100)))
  }

  /**
   * Get vehicle fuel level.
   *
   * @param vehicle - Vehicle handle
   * @returns Fuel level (0.0-1.0)
   */
  getFuel(vehicle: number): number {
    if (!DoesEntityExist(vehicle)) return 0
    return GetVehicleFuelLevel(vehicle) / 100
  }

  /**
   * Get the closest vehicle to the player.
   *
   * @param radius - Search radius
   * @returns Vehicle handle or null
   */
  getClosest(radius = 10.0): number | null {
    const playerPed = PlayerPedId()
    const [px, py, pz] = GetEntityCoords(playerPed, true)

    const vehicle = GetClosestVehicle(px, py, pz, radius, 0, 71)
    return vehicle !== 0 ? vehicle : null
  }

  /**
   * Check if the player is in a vehicle.
   */
  isPlayerInVehicle(): boolean {
    return IsPedInAnyVehicle(PlayerPedId(), false)
  }

  /**
   * Get the vehicle the player is currently in.
   *
   * @returns Vehicle handle or null
   */
  getCurrentVehicle(): number | null {
    const ped = PlayerPedId()
    if (!IsPedInAnyVehicle(ped, false)) return null
    return GetVehiclePedIsIn(ped, false)
  }

  /**
   * Get the last vehicle the player was in.
   *
   * @returns Vehicle handle or null
   */
  getLastVehicle(): number | null {
    const vehicle = GetVehiclePedIsIn(PlayerPedId(), true)
    return vehicle !== 0 ? vehicle : null
  }

  /**
   * Check if player is the driver of their current vehicle.
   */
  isPlayerDriver(): boolean {
    const vehicle = this.getCurrentVehicle()
    if (!vehicle) return false
    return GetPedInVehicleSeat(vehicle, -1) === PlayerPedId()
  }

  /**
   * Apply modifications to a vehicle.
   *
   * @param vehicle - Vehicle handle
   * @param mods - Modifications to apply
   */
  setMods(vehicle: number, mods: VehicleMods): void {
    if (!DoesEntityExist(vehicle)) return

    SetVehicleModKit(vehicle, 0)

    if (mods.spoiler !== undefined) SetVehicleMod(vehicle, 0, mods.spoiler, false)
    if (mods.frontBumper !== undefined) SetVehicleMod(vehicle, 1, mods.frontBumper, false)
    if (mods.rearBumper !== undefined) SetVehicleMod(vehicle, 2, mods.rearBumper, false)
    if (mods.sideSkirt !== undefined) SetVehicleMod(vehicle, 3, mods.sideSkirt, false)
    if (mods.exhaust !== undefined) SetVehicleMod(vehicle, 4, mods.exhaust, false)
    if (mods.frame !== undefined) SetVehicleMod(vehicle, 5, mods.frame, false)
    if (mods.grille !== undefined) SetVehicleMod(vehicle, 6, mods.grille, false)
    if (mods.hood !== undefined) SetVehicleMod(vehicle, 7, mods.hood, false)
    if (mods.fender !== undefined) SetVehicleMod(vehicle, 8, mods.fender, false)
    if (mods.rightFender !== undefined) SetVehicleMod(vehicle, 9, mods.rightFender, false)
    if (mods.roof !== undefined) SetVehicleMod(vehicle, 10, mods.roof, false)
    if (mods.engine !== undefined) SetVehicleMod(vehicle, 11, mods.engine, false)
    if (mods.brakes !== undefined) SetVehicleMod(vehicle, 12, mods.brakes, false)
    if (mods.transmission !== undefined) SetVehicleMod(vehicle, 13, mods.transmission, false)
    if (mods.horns !== undefined) SetVehicleMod(vehicle, 14, mods.horns, false)
    if (mods.suspension !== undefined) SetVehicleMod(vehicle, 15, mods.suspension, false)
    if (mods.armor !== undefined) SetVehicleMod(vehicle, 16, mods.armor, false)

    if (mods.turbo !== undefined) ToggleVehicleMod(vehicle, 18, mods.turbo)
    if (mods.xenon !== undefined) ToggleVehicleMod(vehicle, 22, mods.xenon)

    if (mods.wheelType !== undefined) SetVehicleWheelType(vehicle, mods.wheelType)
    if (mods.wheels !== undefined) SetVehicleMod(vehicle, 23, mods.wheels, false)
    if (mods.windowTint !== undefined) SetVehicleWindowTint(vehicle, mods.windowTint)
    if (mods.livery !== undefined) SetVehicleLivery(vehicle, mods.livery)
    if (mods.plateStyle !== undefined) SetVehicleNumberPlateTextIndex(vehicle, mods.plateStyle)
  }

  /**
   * Set vehicle doors locked state.
   *
   * @param vehicle - Vehicle handle
   * @param locked - Whether doors should be locked
   */
  setDoorsLocked(vehicle: number, locked: boolean): void {
    if (!DoesEntityExist(vehicle)) return
    SetVehicleDoorsLocked(vehicle, locked ? 2 : 0)
  }

  /**
   * Set vehicle engine state.
   *
   * @param vehicle - Vehicle handle
   * @param running - Whether engine should be running
   * @param instant - Whether to start instantly
   */
  setEngineRunning(vehicle: number, running: boolean, instant = false): void {
    if (!DoesEntityExist(vehicle)) return
    SetVehicleEngineOn(vehicle, running, instant, true)
  }

  /**
   * Set vehicle invincibility.
   *
   * @param vehicle - Vehicle handle
   * @param invincible - Whether vehicle should be invincible
   */
  setInvincible(vehicle: number, invincible: boolean): void {
    if (!DoesEntityExist(vehicle)) return
    SetEntityInvincible(vehicle, invincible)
  }

  /**
   * Get vehicle speed in km/h.
   *
   * @param vehicle - Vehicle handle
   */
  getSpeed(vehicle: number): number {
    if (!DoesEntityExist(vehicle)) return 0
    return GetEntitySpeed(vehicle) * 3.6 // Convert m/s to km/h
  }

  /**
   * Set vehicle heading/rotation.
   *
   * @param vehicle - Vehicle handle
   * @param heading - Heading in degrees
   */
  setHeading(vehicle: number, heading: number): void {
    if (!DoesEntityExist(vehicle)) return
    SetEntityHeading(vehicle, heading)
  }

  /**
   * Teleport a vehicle to a position.
   *
   * @param vehicle - Vehicle handle
   * @param position - Target position
   * @param heading - Optional heading
   */
  teleport(vehicle: number, position: Vector3, heading?: number): void {
    if (!DoesEntityExist(vehicle)) return

    SetEntityCoords(vehicle, position.x, position.y, position.z, false, false, false, true)
    if (heading !== undefined) {
      SetEntityHeading(vehicle, heading)
    }
    SetVehicleOnGroundProperly(vehicle)
  }
}
