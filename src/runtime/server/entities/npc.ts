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

export interface NpcSession {
  id: string
  handle: number
  netId?: number
  model: string
  modelHash: number
  persistent: boolean
  routingBucket: number
  createdAt: number
}

/**
 * Server-side runtime representation of an NPC ped.
 *
 * @remarks
 * NPC lifecycle (create/remove/registry) is handled by the `Npcs` API.
 * This entity wraps a spawned ped and provides high-level operations.
 */
export class NPC extends BaseEntity implements Spatial {
  constructor(
    private readonly session: NpcSession,
    private readonly adapters: NpcAdapters,
  ) {
    super(`npc:${session.id}`)
  }

  get npcId(): string {
    return this.session.id
  }

  get handle(): number {
    return this.session.handle
  }

  get netId(): number | undefined {
    return this.session.netId
  }

  get model(): string {
    return this.session.model
  }

  get modelHash(): number {
    return this.session.modelHash
  }

  get createdAt(): number {
    return this.session.createdAt
  }

  get persistent(): boolean {
    return this.session.persistent
  }

  get exists(): boolean {
    return this.adapters.entityServer.doesExist(this.session.handle)
  }

  getPosition(): Vector3 {
    return this.adapters.entityServer.getCoords(this.session.handle)
  }

  setPosition(position: Vector3): void {
    if (!this.exists) return
    this.adapters.entityServer.setPosition(this.session.handle, position, { clearArea: true })
  }

  getHeading(): number {
    return this.adapters.entityServer.getHeading(this.session.handle)
  }

  setHeading(heading: number): void {
    if (!this.exists) return
    this.adapters.entityServer.setHeading(this.session.handle, heading)
  }

  setRoutingBucket(bucket: number): void {
    if (!this.exists) return
    this.adapters.entityServer.setRoutingBucket(this.session.handle, bucket)
    this.session.routingBucket = bucket
    this._dimension = bucket
  }

  getRoutingBucket(): number {
    return this.adapters.entityServer.getRoutingBucket(this.session.handle)
  }

  override get dimension(): number {
    return this.getRoutingBucket()
  }

  override set dimension(value: number) {
    this.setRoutingBucket(value)
  }

  getHealth(): number {
    return this.adapters.entityServer.getHealth(this.session.handle)
  }

  setHealth(health: number): void {
    if (!this.exists) return
    this.adapters.entityServer.setHealth(this.session.handle, health)
  }

  getArmor(): number {
    return this.adapters.entityServer.getArmor(this.session.handle)
  }

  setArmor(armor: number): void {
    if (!this.exists) return
    this.adapters.entityServer.setArmor(this.session.handle, armor)
  }

  kill(): void {
    this.setHealth(0)
  }

  isAlive(): boolean {
    return this.getHealth() > 100
  }

  setSyncedState(key: string, value: unknown, replicated: boolean = true): void {
    if (!this.exists) return
    this.adapters.entityServer.getStateBag(this.session.handle).set(key, value, replicated)
  }

  getSyncedState<T = unknown>(key: string): T | undefined {
    if (!this.exists) return undefined
    return this.adapters.entityServer.getStateBag(this.session.handle).get(key) as T | undefined
  }

  delete(): void {
    if (!this.exists) return
    this.adapters.pedServer.delete(this.session.handle)
  }

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
