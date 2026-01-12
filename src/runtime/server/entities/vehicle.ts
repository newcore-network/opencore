import { Vector3 } from '@open-core/framework'
import { IEntityServer } from '../../../adapters/contracts/server/IEntityServer'
import { IVehicleServer } from '../../../adapters/contracts/server/IVehicleServer'
import {
  SerializedVehicleData,
  VehicleMetadata,
  VehicleMods,
  VehicleOwnership,
} from '../types/vehicle.types'

/**
 * Adapter bundle for vehicle operations.
 * Passed to Vehicle instances by VehicleService.
 */
export interface VehicleAdapters {
  entityServer: IEntityServer
  vehicleServer: IVehicleServer
}

/**
 * Server-side representation of a vehicle entity.
 *
 * This class wraps FiveM server-side vehicle natives and manages vehicle state.
 * All vehicle creation and modification should go through this entity
 * to ensure proper synchronization and security.
 *
 * ⚠️ **Design Note:** Vehicles are created server-side using CreateVehicleServerSetter
 * to prevent client-side spawning abuse. Network IDs are used for cross-client references.
 *
 * ⚠️ **Important:** Visual modifications (mods, repairs, fuel) are stored in state bags
 * and must be applied client-side. The server only stores the desired state.
 */
export class Vehicle {
  private readonly _networkId: number
  private readonly _handle: number
  private readonly _adapters: VehicleAdapters
  private readonly _model: string
  private readonly _modelHash: number
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
   * @param adapters - Platform adapters for entity/vehicle operations
   * @param persistent - Whether the vehicle should persist
   * @param routingBucket - The routing bucket the vehicle belongs to
   */
  constructor(
    handle: number,
    networkId: number,
    ownership: VehicleOwnership,
    adapters: VehicleAdapters,
    persistent: boolean = false,
    routingBucket: number = 0,
    model: string,
    modelHash: number,
  ) {
    this._handle = handle
    this._networkId = networkId
    this._ownership = ownership
    this._adapters = adapters
    this._persistent = persistent
    this._routingBucket = routingBucket
    this._model = model
    this._modelHash = modelHash

    if (persistent) {
      this._adapters.entityServer.setOrphanMode(handle, 2)
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
    return this._adapters.entityServer.doesExist(this._handle)
  }

  get model(): string {
    return this._model
  }

  get modelHash(): number {
    return this._modelHash
  }

  get position(): Vector3 {
    return this._adapters.entityServer.getCoords(this._handle)
  }

  get heading(): number {
    return this._adapters.entityServer.getHeading(this._handle)
  }

  get plate(): string {
    return this._adapters.vehicleServer.getNumberPlateText(this._handle)
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
   * Stores modifications in state bag for client-side application.
   *
   * @remarks
   * Mods are stored server-side and synced via state bags.
   * The client must read and apply these modifications locally.
   *
   * @param mods - Modifications to store
   */
  setMods(mods: Partial<VehicleMods>): void {
    if (!this.exists) return

    this._mods = { ...this._mods, ...mods }
    this._metadata.modifiedAt = Date.now()

    // Sync to state bag for client-side application
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
    this._adapters.entityServer.setRoutingBucket(this._handle, bucket)
    this._routingBucket = bucket
  }

  /**
   * Sets the license plate text.
   *
   * @param plate - Plate text (max 8 characters)
   */
  setPlate(plate: string): void {
    if (!this.exists) return
    this._adapters.vehicleServer.setNumberPlateText(this._handle, plate.substring(0, 8))
  }

  /**
   * Sets the vehicle colors (server-side native).
   *
   * @param primaryColor - Primary color index
   * @param secondaryColor - Secondary color index
   */
  setColors(primaryColor?: number, secondaryColor?: number): void {
    if (!this.exists) return

    const [currentPrimary, currentSecondary] = this._adapters.vehicleServer.getColours(this._handle)
    this._adapters.vehicleServer.setColours(
      this._handle,
      primaryColor ?? currentPrimary,
      secondaryColor ?? currentSecondary,
    )
  }

  /**
   * Marks vehicle for repair (client applies the actual repair).
   *
   * @remarks
   * Sets a state bag flag that clients should watch to apply repair locally.
   */
  markForRepair(): void {
    if (!this.exists) return
    this._metadata.needsRepair = true
    this._metadata.repairRequestedAt = Date.now()
    this.syncStateBag('needsRepair', true)
  }

  /**
   * Sets the fuel level (stored in metadata, applied client-side).
   *
   * @param level - Fuel level (0–100)
   */
  setFuel(level: number): void {
    if (!this.exists) return

    const clampedLevel = Math.max(0, Math.min(100, level))
    this._metadata.fuel = clampedLevel
    this.syncStateBag('fuel', clampedLevel)
  }

  /**
   * Gets the stored fuel level from metadata.
   *
   * @returns Fuel level (0-100) or 100 if not set
   */
  getFuel(): number {
    return this._metadata.fuel ?? 100
  }

  /**
   * Sets the vehicle doors locked state (server-side native).
   *
   * @param locked - Whether doors should be locked
   */
  setDoorsLocked(locked: boolean): void {
    if (!this.exists) return
    this._adapters.vehicleServer.setDoorsLocked(this._handle, locked ? 2 : 1)
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
    this._adapters.entityServer.setCoords(
      this._handle,
      position.x,
      position.y,
      position.z,
      false,
      false,
      false,
      true,
    )
    if (heading !== undefined) {
      this._adapters.entityServer.setHeading(this._handle, heading)
    }
  }

  /**
   * Deletes the vehicle from the server.
   */
  delete(): void {
    if (!this.exists) return
    this._adapters.entityServer.delete(this._handle)
  }

  /**
   * Syncs data to the vehicle's state bag for client access.
   *
   * @param key - State bag key
   * @param value - Value to sync
   */
  private syncStateBag(key: string, value: any): void {
    const stateBag = this._adapters.entityServer.getStateBag(this._handle)
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
      modelHash: this.modelHash,
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
