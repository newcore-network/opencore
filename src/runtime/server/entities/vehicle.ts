import type { Vector3 } from '../../../kernel/utils'
import type {
  VehicleOwnership,
  VehicleMods,
  VehicleMetadata,
  SerializedVehicleData,
} from '../types/vehicle.types'

/**
 * Server-side representation of a vehicle entity.
 *
 * This class wraps FiveM vehicle natives and manages vehicle state.
 * All vehicle creation and modification should go through this entity
 * to ensure proper synchronization and security.
 *
 * ⚠️ **Design Note:** Vehicles are created server-side using CreateVehicleServerSetter
 * to prevent client-side spawning abuse. Network IDs are used for cross-client references.
 */
export class Vehicle {
  private readonly _networkId: number
  private readonly _handle: number
  private _ownership: VehicleOwnership
  private _mods: VehicleMods = {}
  private _metadata: VehicleMetadata = {}
  private _persistent: boolean
  private _routingBucket: number

  /**
   * Creates a new Vehicle entity instance.
   * This should only be instantiated by VehicleService after server-side creation.
   *
   * @param handle - The server-side entity handle
   * @param networkId - The network ID for cross-client reference
   * @param ownership - Ownership information
   * @param persistent - Whether the vehicle should persist
   * @param routingBucket - The routing bucket the vehicle belongs to
   */
  constructor(
    handle: number,
    networkId: number,
    ownership: VehicleOwnership,
    persistent: boolean = false,
    routingBucket: number = 0,
  ) {
    this._handle = handle
    this._networkId = networkId
    this._ownership = ownership
    this._persistent = persistent
    this._routingBucket = routingBucket

    if (persistent) {
      SetEntityOrphanMode(handle, 2)
    }

    this._metadata.createdAt = Date.now()
  }

  get handle(): number {
    return this._handle
  }

  get networkId(): number {
    return this._networkId
  }

  get ownership(): VehicleOwnership {
    return { ...this._ownership }
  }

  get mods(): VehicleMods {
    return { ...this._mods }
  }

  get metadata(): VehicleMetadata {
    return { ...this._metadata }
  }

  get persistent(): boolean {
    return this._persistent
  }

  get routingBucket(): number {
    return this._routingBucket
  }

  get exists(): boolean {
    return DoesEntityExist(this._handle)
  }

  get model(): number {
    return GetEntityModel(this._handle)
  }

  get position(): Vector3 {
    const coords = GetEntityCoords(this._handle)
    return { x: coords[0], y: coords[1], z: coords[2] }
  }

  get heading(): number {
    return GetEntityHeading(this._handle)
  }

  get plate(): string {
    return GetVehicleNumberPlateText(this._handle)
  }

  /**
   * Updates the ownership of the vehicle.
   *
   * @param ownership - New ownership information
   */
  setOwnership(ownership: Partial<VehicleOwnership>): void {
    this._ownership = { ...this._ownership, ...ownership }
    this.syncStateBag('ownership', this._ownership)
  }

  /**
   * Applies modifications to the vehicle.
   *
   * @param mods - Modifications to apply
   */
  applyMods(mods: Partial<VehicleMods>): void {
    if (!this.exists) return

    this._mods = { ...this._mods, ...mods }
    this._metadata.modifiedAt = Date.now()

    SetVehicleModKit(this._handle, 0)

    if (mods.spoiler !== undefined) SetVehicleMod(this._handle, 0, mods.spoiler, false)
    if (mods.frontBumper !== undefined) SetVehicleMod(this._handle, 1, mods.frontBumper, false)
    if (mods.rearBumper !== undefined) SetVehicleMod(this._handle, 2, mods.rearBumper, false)
    if (mods.sideSkirt !== undefined) SetVehicleMod(this._handle, 3, mods.sideSkirt, false)
    if (mods.exhaust !== undefined) SetVehicleMod(this._handle, 4, mods.exhaust, false)
    if (mods.frame !== undefined) SetVehicleMod(this._handle, 5, mods.frame, false)
    if (mods.grille !== undefined) SetVehicleMod(this._handle, 6, mods.grille, false)
    if (mods.hood !== undefined) SetVehicleMod(this._handle, 7, mods.hood, false)
    if (mods.fender !== undefined) SetVehicleMod(this._handle, 8, mods.fender, false)
    if (mods.rightFender !== undefined) SetVehicleMod(this._handle, 9, mods.rightFender, false)
    if (mods.roof !== undefined) SetVehicleMod(this._handle, 10, mods.roof, false)
    if (mods.engine !== undefined) SetVehicleMod(this._handle, 11, mods.engine, false)
    if (mods.brakes !== undefined) SetVehicleMod(this._handle, 12, mods.brakes, false)
    if (mods.transmission !== undefined) SetVehicleMod(this._handle, 13, mods.transmission, false)
    if (mods.horns !== undefined) SetVehicleMod(this._handle, 14, mods.horns, false)
    if (mods.suspension !== undefined) SetVehicleMod(this._handle, 15, mods.suspension, false)
    if (mods.armor !== undefined) SetVehicleMod(this._handle, 16, mods.armor, false)

    if (mods.turbo !== undefined) ToggleVehicleMod(this._handle, 18, mods.turbo)
    if (mods.xenon !== undefined) ToggleVehicleMod(this._handle, 22, mods.xenon)

    if (mods.wheelType !== undefined) SetVehicleWheelType(this._handle, mods.wheelType)
    if (mods.wheels !== undefined) SetVehicleMod(this._handle, 23, mods.wheels, false)
    if (mods.windowTint !== undefined) SetVehicleWindowTint(this._handle, mods.windowTint)

    if (mods.primaryColor !== undefined || mods.secondaryColor !== undefined) {
      const [currentPrimary, currentSecondary] = GetVehicleColours(this._handle)
      SetVehicleColours(
        this._handle,
        mods.primaryColor ?? currentPrimary,
        mods.secondaryColor ?? currentSecondary,
      )
    }

    if (mods.pearlescentColor !== undefined || mods.wheelColor !== undefined) {
      const [currentPearl, currentWheel] = GetVehicleExtraColours(this._handle)
      SetVehicleExtraColours(
        this._handle,
        mods.pearlescentColor ?? currentPearl,
        mods.wheelColor ?? currentWheel,
      )
    }

    if (mods.neonEnabled !== undefined) {
      SetVehicleNeonLightEnabled(this._handle, 0, mods.neonEnabled[0])
      SetVehicleNeonLightEnabled(this._handle, 1, mods.neonEnabled[1])
      SetVehicleNeonLightEnabled(this._handle, 2, mods.neonEnabled[2])
      SetVehicleNeonLightEnabled(this._handle, 3, mods.neonEnabled[3])
    }

    if (mods.neonColor !== undefined) {
      SetVehicleNeonLightsColour(
        this._handle,
        mods.neonColor[0],
        mods.neonColor[1],
        mods.neonColor[2],
      )
    }

    if (mods.extras) {
      for (const [extraId, enabled] of Object.entries(mods.extras)) {
        SetVehicleExtra(this._handle, Number(extraId), !enabled)
      }
    }

    if (mods.livery !== undefined) {
      SetVehicleLivery(this._handle, mods.livery)
    }

    if (mods.plateStyle !== undefined) {
      SetVehicleNumberPlateTextIndex(this._handle, mods.plateStyle)
    }

    this.syncStateBag('mods', this._mods)
  }

  /**
   * Sets custom metadata for the vehicle.
   *
   * @param key - Metadata key
   * @param value - Metadata value
   */
  setMetadata(key: string, value: any): void {
    this._metadata[key] = value
    this.syncStateBag(`meta_${key}`, value)
  }

  /**
   * Gets metadata value by key.
   *
   * @param key - Metadata key
   * @returns The metadata value or undefined
   */
  getMetadata<T = any>(key: string): T | undefined {
    return this._metadata[key] as T | undefined
  }

  /**
   * Sets the routing bucket for the vehicle.
   *
   * @param bucket - Routing bucket ID
   */
  setRoutingBucket(bucket: number): void {
    if (!this.exists) return
    SetEntityRoutingBucket(this._handle, bucket)
    this._routingBucket = bucket
  }

  /**
   * Repairs the vehicle completely.
   */
  repair(): void {
    if (!this.exists) return
    SetVehicleFixed(this._handle)
    SetVehicleDeformationFixed(this._handle)
    SetVehicleUndriveable(this._handle, false)
    SetVehicleEngineOn(this._handle, true, true, false)
    SetVehicleEngineHealth(this._handle, 1000.0)
    SetVehiclePetrolTankHealth(this._handle, 1000.0)
    this._metadata.engineHealth = 1000.0
    this._metadata.bodyHealth = 1000.0
    this.syncStateBag('health', { engine: 1000.0, body: 1000.0 })
  }

  /**
   * Sets the fuel level.
   *
   * @param level - Fuel level (0–100)
   */
  setFuel(level: number): void {
    if (!this.exists) return

    const clampedLevel = Math.max(0, Math.min(100, level))
    SetVehicleFuelLevel(this._handle, clampedLevel)
    this._metadata.fuel = clampedLevel
    this.syncStateBag('fuel', clampedLevel)
  }

  /**
   * Gets the current fuel level.
   *
   * @returns Fuel level (0.0-1.0)
   */
  getFuel(): number {
    if (!this.exists) return 0
    return GetVehicleFuelLevel(this._handle) / 100
  }

  /**
   * Sets the vehicle doors locked state.
   *
   * @param locked - Whether doors should be locked
   */
  setDoorsLocked(locked: boolean): void {
    if (!this.exists) return
    SetVehicleDoorsLocked(this._handle, locked ? 2 : 1)
    this.syncStateBag('locked', locked)
  }

  /**
   * Teleports the vehicle to a position.
   *
   * @param position - Target position
   * @param heading - Optional heading
   */
  teleport(position: Vector3, heading?: number): void {
    if (!this.exists) return
    SetEntityCoords(this._handle, position.x, position.y, position.z, false, false, false, true)
    if (heading !== undefined) {
      SetEntityHeading(this._handle, heading)
    }
  }

  /**
   * Deletes the vehicle from the server.
   */
  delete(): void {
    if (!this.exists) return
    DeleteEntity(this._handle)
  }

  /**
   * Syncs data to the vehicle's state bag for client access.
   *
   * @param key - State bag key
   * @param value - Value to sync
   */
  private syncStateBag(key: string, value: any): void {
    const stateBag = Entity(this._handle).state
    stateBag.set(key, value, true)
  }

  /**
   * Serializes the vehicle data for network transfer.
   *
   * @returns Serialized vehicle data
   */
  serialize(): SerializedVehicleData {
    return {
      networkId: this._networkId,
      handle: this._handle,
      model: this.model,
      position: this.position,
      heading: this.heading,
      plate: this.plate,
      ownership: this.ownership,
      mods: this.mods,
      metadata: this.metadata,
      routingBucket: this._routingBucket,
      persistent: this._persistent,
    }
  }
}
