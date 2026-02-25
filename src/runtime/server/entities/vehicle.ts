import { IEntityServer } from '../../../adapters/contracts/server/IEntityServer'
import { IVehicleServer } from '../../../adapters/contracts/server/IVehicleServer'
import { Vector3 } from '../../../kernel/utils/vector3'
import { BaseEntity } from '../../core/entity'
import { NativeHandle } from '../../core/nativehandle'
import { Spatial } from '../../core/spatial'
import {
  SerializedVehicleData,
  VehicleMetadata,
  VehicleMods,
  VehicleOwnership,
} from '../types/vehicle.types'

/**
 * Adapter bundle used by {@link Vehicle} to call platform-specific natives.
 */
export interface VehicleAdapters {
  entityServer: IEntityServer
  vehicleServer: IVehicleServer
}

interface VehicleSession {
  handle: number
  networkId: number
  model: string
  modelHash: number
  persistent: boolean
  routingBucket: number
  createdAt: number
}

/**
 * Runtime representation of a server-managed vehicle entity.
 *
 * @remarks
 * This class stores ownership/mod/metadata state and delegates native calls through
 * framework adapters. Most mutating methods are no-ops when the entity no longer exists.
 */
export class Vehicle extends BaseEntity implements Spatial, NativeHandle {
  private readonly session: VehicleSession
  private readonly adapters: VehicleAdapters
  private ownershipData: VehicleOwnership
  private modsData: VehicleMods = {}
  private metadataData: VehicleMetadata = {}

  /**
   * Creates a new vehicle entity wrapper.
   *
   * @param handle - Native entity handle.
   * @param networkId - Network ID for cross-client references.
   * @param ownership - Initial ownership descriptor.
   * @param adapters - Entity/vehicle adapters.
   * @param persistent - Whether orphan mode should keep this entity alive.
   * @param routingBucket - Initial routing bucket.
   * @param model - Resolved model string.
   * @param modelHash - Spawn model hash.
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
    super(`car:${handle}`)

    this.adapters = adapters
    this.ownershipData = ownership
    this.session = {
      handle,
      networkId,
      model,
      modelHash,
      persistent,
      routingBucket,
      createdAt: Date.now(),
    }

    if (persistent) {
      this.adapters.entityServer.setOrphanMode(handle, 2)
    }

    this.metadataData.createdAt = this.session.createdAt
    this._dimension = routingBucket
  }

  /** Returns the native entity handle. */
  getHandle(): number {
    return this.session.handle
  }

  /** Returns current world coordinates. */
  getPosition(): Vector3 {
    return this.adapters.entityServer.getCoords(this.session.handle)
  }

  /** Teleports the entity to a target position. */
  setPosition(position: Vector3): void {
    if (!this.exists) return
    this.adapters.entityServer.setPosition(this.session.handle, position, { clearArea: true })
  }

  /** Returns current heading (yaw). */
  getHeading(): number {
    return this.adapters.entityServer.getHeading(this.session.handle)
  }

  /** Sets heading (yaw) in degrees. */
  setHeading(heading: number): void {
    if (!this.exists) return
    this.adapters.entityServer.setHeading(this.session.handle, heading)
  }

  /** Native handle shortcut. */
  get handle(): number {
    return this.session.handle
  }

  /** Stable network ID. */
  get networkId(): number {
    return this.session.networkId
  }

  /** Resolved model identifier. */
  get model(): string {
    return this.session.model
  }

  /** Model hash used at spawn time. */
  get modelHash(): number {
    return this.session.modelHash
  }

  /** Whether the vehicle is configured as persistent. */
  get persistent(): boolean {
    return this.session.persistent
  }

  /** Current routing bucket/dimension. */
  get routingBucket(): number {
    return this.getRoutingBucket()
  }

  /** Dimension alias for routing bucket. */
  override get dimension(): number {
    return this.getRoutingBucket()
  }

  /** Dimension alias for routing bucket. */
  override set dimension(value: number) {
    this.setRoutingBucket(value)
  }

  /** Snapshot of ownership data. */
  get ownership(): VehicleOwnership {
    return { ...this.ownershipData }
  }

  /** Snapshot of stored mods. */
  get mods(): VehicleMods {
    return { ...this.modsData }
  }

  /** Snapshot of metadata values. */
  get metadata(): VehicleMetadata {
    return { ...this.metadataData }
  }

  /** True when the underlying native entity exists. */
  get exists(): boolean {
    return this.adapters.entityServer.doesExist(this.session.handle)
  }

  /** Position shorthand using {@link getPosition}. */
  get position(): Vector3 {
    return this.getPosition()
  }

  /** Heading shorthand using {@link getHeading}. */
  get heading(): number {
    return this.getHeading()
  }

  /** Current license plate text. */
  get plate(): string {
    return this.adapters.vehicleServer.getNumberPlateText(this.session.handle)
  }

  /** Merges ownership data and replicates it to state bag. */
  setOwnership(ownership: Partial<VehicleOwnership>): void {
    this.ownershipData = { ...this.ownershipData, ...ownership }
    this.syncStateBag('ownership', this.ownershipData)
  }

  /** Merges vehicle mod state and updates modification timestamp. */
  setMods(mods: Partial<VehicleMods>): void {
    if (!this.exists) return

    this.modsData = { ...this.modsData, ...mods }
    this.metadataData.modifiedAt = Date.now()
    this.syncStateBag('mods', this.modsData)
  }

  /** Stores custom metadata and replicates it to state bag. */
  setMetadata(key: string, value: unknown): void {
    this.metadataData[key] = value
    this.syncStateBag(`meta_${key}`, value)
  }

  /** Reads one metadata value by key. */
  getMetadata<T = unknown>(key: string): T | undefined {
    return this.metadataData[key] as T | undefined
  }

  /** Reads current routing bucket, using cached value if entity no longer exists. */
  getRoutingBucket(): number {
    if (!this.exists) {
      return this.session.routingBucket
    }
    return this.adapters.entityServer.getRoutingBucket(this.session.handle)
  }

  /** Sets routing bucket and updates local dimension snapshot. */
  setRoutingBucket(bucket: number): void {
    if (!this.exists) return
    this.adapters.entityServer.setRoutingBucket(this.session.handle, bucket)
    this.session.routingBucket = bucket
    this._dimension = bucket
  }

  /** Sets plate text (trimmed to 8 chars). */
  setPlate(plate: string): void {
    if (!this.exists) return
    this.adapters.vehicleServer.setNumberPlateText(this.session.handle, plate.substring(0, 8))
  }

  /** Sets primary/secondary vehicle colors. */
  setColors(primaryColor?: number, secondaryColor?: number): void {
    if (!this.exists) return

    const [currentPrimary, currentSecondary] = this.adapters.vehicleServer.getColours(this.session.handle)
    this.adapters.vehicleServer.setColours(
      this.session.handle,
      primaryColor ?? currentPrimary,
      secondaryColor ?? currentSecondary,
    )
  }

  /** Flags this vehicle for repair through replicated metadata. */
  markForRepair(): void {
    if (!this.exists) return
    this.metadataData.needsRepair = true
    this.metadataData.repairRequestedAt = Date.now()
    this.syncStateBag('needsRepair', true)
  }

  /** Sets fuel level in range 0-100. */
  setFuel(level: number): void {
    if (!this.exists) return

    const clamped = Math.max(0, Math.min(100, level))
    this.metadataData.fuel = clamped
    this.syncStateBag('fuel', clamped)
  }

  /** Gets stored fuel level, defaulting to 100. */
  getFuel(): number {
    return this.metadataData.fuel ?? 100
  }

  /** Locks or unlocks doors and replicates lock state. */
  setDoorsLocked(locked: boolean): void {
    if (!this.exists) return
    this.adapters.vehicleServer.setDoorsLocked(this.session.handle, locked ? 2 : 1)
    this.syncStateBag('locked', locked)
  }

  /** Teleports vehicle and optionally sets heading. */
  teleport(position: Vector3, heading?: number): void {
    if (!this.exists) return
    this.setPosition(position)
    if (heading !== undefined) {
      this.setHeading(heading)
    }
  }

  /** Deletes the underlying entity. */
  delete(): void {
    if (!this.exists) return
    this.adapters.entityServer.delete(this.session.handle)
  }

  /** Serializes this vehicle state for transport. */
  serialize(): SerializedVehicleData {
    return {
      networkId: this.session.networkId,
      handle: this.session.handle,
      modelHash: this.modelHash,
      model: this.model,
      position: this.position,
      heading: this.heading,
      plate: this.plate,
      ownership: this.ownership,
      mods: this.mods,
      metadata: this.metadata,
      routingBucket: this.routingBucket,
      persistent: this.session.persistent,
    }
  }

  /** Writes one replicated value to entity state bag. */
  private syncStateBag(key: string, value: unknown): void {
    if (!this.exists) return
    this.adapters.entityServer.getStateBag(this.session.handle).set(key, value, true)
  }
}
