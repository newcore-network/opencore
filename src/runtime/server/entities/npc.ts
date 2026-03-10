import { NativeHandle } from 'src/runtime/core/nativehandle'
import { IEntityServer } from '../../../adapters/contracts/server/IEntityServer'
import { IPedServer } from '../../../adapters/contracts/server/IPedServer'
import { Vector3 } from '../../../kernel/utils/vector3'
import { BaseEntity } from '../../core/entity'
import { Spatial } from '../../core/spatial'
import { SerializedNpcData } from '../types/npc.types'

export interface NpcAdapters {
  entityServer: IEntityServer
  pedServer: IPedServer
}

/**
 * Immutable-ish runtime session snapshot for an NPC.
 *
 * @remarks
 * This structure represents the identity and creation-time properties of the NPC.
 * Some fields (like `routingBucket`) may be updated by {@link NPC.setRoutingBucket}.
 */
export interface NpcSession {
  /** Stable logical id for this NPC within the runtime. */
  id: string
  /** Native entity handle for the ped (runtime-specific). */
  handle: number
  /** Network id (netId) if the ped is networked, otherwise undefined. */
  netId?: number
  /** Model identifier as provided/resolved at creation time (string form). */
  model: string
  /** Model hash used at spawn time. */
  modelHash: number
  /** Whether the NPC is configured to be treated as persistent (orphan mode). */
  persistent: boolean
  /** Routing bucket / dimension assigned at creation time. */
  routingBucket: number
  /** Unix timestamp (ms) when the NPC was created. */
  createdAt: number
}

/**
 * Server-side runtime representation of an NPC ped.
 *
 * @remarks
 * - Lifecycle (spawn, registry, deletion, cleanup) is handled by the {@link Npcs} API.
 * - This entity is a high-level wrapper around a spawned ped handle.
 * - Most mutating methods are no-ops when {@link exists} is false.
 *
 * @example
 * ```ts
 * const npc = npcs.getById(npcId)
 * if (npc?.exists) {
 *   npc.setHeading(90)
 *   npc.setSyncedState('mood', 'angry')
 * }
 * ```
 */
export class NPC extends BaseEntity implements Spatial, NativeHandle {
  constructor(
    private readonly session: NpcSession,
    private readonly adapters: NpcAdapters,
  ) {
    super(`npc:${session.id}`)
  }

  getHandle(): number {
    return this.session.handle
  }

  /**
   * Stable logical identifier of the NPC within the runtime.
   *
   * @returns NPC id string.
   */
  get npcId(): string {
    return this.session.id
  }

  /**
   * Network id (netId) of the entity, if the NPC was spawned networked.
   *
   * @returns netId or `undefined`.
   */
  get netId(): number | undefined {
    return this.session.netId
  }

  /**
   * Resolved model identifier (string form) used for this NPC.
   *
   * @remarks
   * If the NPC was spawned from a hash, this may be the hash string representation.
   */
  get model(): string {
    return this.session.model
  }

  /**
   * Model hash used at spawn time.
   */
  get modelHash(): number {
    return this.session.modelHash
  }

  /**
   * Creation timestamp (Unix ms).
   */
  get createdAt(): number {
    return this.session.createdAt
  }

  /**
   * Whether this NPC was configured as persistent (orphan mode).
   *
   * @remarks
   * The actual persistence behavior is enforced by the runtime/adapters.
   */
  get persistent(): boolean {
    return this.session.persistent
  }

  /**
   * Whether the underlying entity currently exists in the runtime.
   *
   * @remarks
   * This is the canonical runtime check used by most mutating methods to avoid native errors.
   */
  get exists(): boolean {
    return this.adapters.entityServer.doesExist(this.session.handle)
  }

  /**
   * Get the current world position of the NPC.
   *
   * @returns NPC coordinates.
   */
  getPosition(): Vector3 {
    return this.adapters.entityServer.getCoords(this.session.handle)
  }

  /**
   * Teleport / set the NPC position.
   *
   * @remarks
   * No-op if {@link exists} is false.
   * Uses `clearArea: true` to reduce collision/overlap issues on placement.
   *
   * @param position - Target position.
   */
  setPosition(position: Vector3): void {
    if (!this.exists) return
    this.adapters.entityServer.setPosition(this.session.handle, position, { clearArea: true })
  }

  /**
   * Get the current heading (yaw) of the NPC.
   *
   * @returns Heading value (degrees).
   */
  getHeading(): number {
    return this.adapters.entityServer.getHeading(this.session.handle)
  }

  /**
   * Set the NPC heading (yaw).
   *
   * @remarks
   * No-op if {@link exists} is false.
   *
   * @param heading - Heading value (degrees).
   */
  setHeading(heading: number): void {
    if (!this.exists) return
    this.adapters.entityServer.setHeading(this.session.handle, heading)
  }

  /**
   * Assign a routing bucket (dimension) to the NPC.
   *
   * @remarks
   * No-op if {@link exists} is false.
   * Updates both the runtime entity and local session fields.
   *
   * @param bucket - Target routing bucket.
   */
  setRoutingBucket(bucket: number): void {
    if (!this.exists) return
    this.adapters.entityServer.setDimension(this.session.handle, bucket)
    this.session.routingBucket = bucket
    this._dimension = bucket
  }

  /**
   * Get the current routing bucket (dimension) of the NPC.
   *
   * @returns Routing bucket.
   */
  getRoutingBucket(): number {
    return this.adapters.entityServer.getDimension(this.session.handle)
  }

  /**
   * Current dimension of the NPC.
   *
   * @remarks
   * This property is wired to routing buckets:
   * reading calls {@link getRoutingBucket}, writing delegates to {@link setRoutingBucket}.
   */
  override get dimension(): number {
    return this.getRoutingBucket()
  }

  /**
   * Set the dimension of the NPC (routing bucket).
   *
   * @param value - New dimension / routing bucket.
   */
  override set dimension(value: number) {
    this.setRoutingBucket(value)
  }

  /**
   * Get NPC health.
   *
   * @returns Health value.
   */
  getHealth(): number {
    return this.adapters.entityServer.getHealth(this.session.handle)
  }

  /**
   * Set NPC health.
   *
   * @remarks
   * No-op if {@link exists} is false.
   *
   * @param health - Target health value.
   */
  setHealth(health: number): void {
    if (!this.exists) return
    this.adapters.entityServer.setHealth(this.session.handle, health)
  }

  /**
   * Get NPC armor.
   *
   * @returns Armor value.
   */
  getArmor(): number {
    return this.adapters.entityServer.getArmor(this.session.handle)
  }

  /**
   * Set NPC armor.
   *
   * @remarks
   * No-op if {@link exists} is false.
   *
   * @param armor - Target armor value.
   */
  setArmor(armor: number): void {
    if (!this.exists) return
    this.adapters.entityServer.setArmor(this.session.handle, armor)
  }

  /**
   * Kill the NPC by forcing its health to zero.
   *
   * @remarks
   * Equivalent to `setHealth(0)`.
   */
  kill(): void {
    this.setHealth(0)
  }

  /**
   * Check whether the NPC is considered alive.
   *
   * @remarks
   * This uses a simple heuristic (`health > 100`) matching common freemode baselines.
   * Adjust if your runtime uses different baselines.
   *
   * @returns `true` if the health threshold indicates alive.
   */
  isAlive(): boolean {
    return this.getHealth() > 100
  }

  /**
   * Set a state bag entry for this NPC.
   *
   * @remarks
   * No-op if {@link exists} is false.
   * When `replicated=true`, the value is replicated to clients (implementation dependent).
   *
   * @param key - State key.
   * @param value - State value.
   * @param replicated - Whether the state should replicate to clients (default: true).
   */
  setSyncedState(key: string, value: unknown, replicated: boolean = true): void {
    if (!this.exists) return
    this.adapters.entityServer.getStateBag(this.session.handle).set(key, value, replicated)
  }

  /**
   * Get a state bag entry for this NPC.
   *
   * @remarks
   * Returns `undefined` if {@link exists} is false or if the key is absent.
   *
   * @typeParam T - Expected value type.
   * @param key - State key.
   * @returns State value (typed) or `undefined`.
   */
  getSyncedState<T = unknown>(key: string): T | undefined {
    if (!this.exists) return undefined
    return this.adapters.entityServer.getStateBag(this.session.handle).get(key) as T | undefined
  }

  /**
   * Delete (despawn) the NPC entity.
   *
   * @remarks
   * No-op if {@link exists} is false.
   * This only deletes the underlying ped. Registry cleanup is handled by {@link Npcs.deleteById}
   * (or related methods), which also removes indexes and world registration.
   */
  delete(): void {
    if (!this.exists) return
    this.adapters.pedServer.delete(this.session.handle)
  }

  /**
   * Serialize the NPC into a transport-friendly plain object.
   *
   * @remarks
   * Includes:
   * - Identity (`id`, `handle`, `netId`)
   * - Model info (`model`, `modelHash`)
   * - Spatial data (`position`, `heading`, `routingBucket`)
   * - Flags (`persistent`)
   * - Timestamp (`createdAt`)
   * - Metadata (`meta`) and state bag snapshot (`states`)
   *
   * @returns A snapshot of the NPC suitable for events, persistence, debugging, or UI.
   */
  serialize(): SerializedNpcData {
    return {
      id: this.session.id,
      handle: this.session.handle,
      netId: this.session.netId,
      model: this.session.model,
      modelHash: this.session.modelHash,
      position: this.getPosition(),
      heading: this.getHeading(),
      routingBucket: this.getRoutingBucket(),
      persistent: this.session.persistent,
      createdAt: this.session.createdAt,
      meta: this.getAllMeta(),
      states: this.all(),
    }
  }
}
