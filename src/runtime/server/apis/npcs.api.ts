import { inject, injectable } from 'tsyringe'
import { v4 as uuid } from 'uuid'
import { IHasher } from '../../../adapters/contracts/IHasher'
import { EventsAPI } from '../../../adapters/contracts/transport/events.api'
import { IEntityServer } from '../../../adapters/contracts/server/IEntityServer'
import { IPedServer } from '../../../adapters/contracts/server/IPedServer'
import { coreLogger } from '../../../kernel/logger'
import { Vector3 } from '../../../kernel/utils/vector3'
import { WorldContext } from '../../core/world'
import { NPC, NpcAdapters, NpcSession } from '../entities/npc'
import { NpcSpawnOptions, NpcSpawnResult, SerializedNpcData } from '../types/npc.types'

const DEFAULT_PED_TYPE = 4
const DEFAULT_SPAWN_TIMEOUT_MS = 2000

/**
 * Server-side service for NPC entity lifecycle.
 *
 * @remarks
 * This API is responsible for spawning, indexing, querying, and destroying NPC entities.
 * AI/behavior systems should consume this API instead of calling natives directly.
 */
@injectable()
export class Npcs {
  private readonly npcById = new Map<string, NPC>()
  private readonly idByHandle = new Map<number, string>()
  private readonly idByNetId = new Map<number, string>()
  private readonly adapters: NpcAdapters

  constructor(
    @inject(WorldContext) private readonly world: WorldContext,
    @inject(IEntityServer as any) private readonly entityServer: IEntityServer,
    @inject(IPedServer as any) private readonly pedServer: IPedServer,
    @inject(IHasher as any) private readonly hasher: IHasher,
    @inject(EventsAPI as any) private readonly events: EventsAPI<'server'>,
  ) {
    this.adapters = {
      entityServer: this.entityServer,
      pedServer: this.pedServer,
    }
  }

  async create(options: NpcSpawnOptions): Promise<{ result: NpcSpawnResult; npc?: NPC }> {
    const {
      id,
      model,
      position,
      heading = 0,
      networked = true,
      pedType = DEFAULT_PED_TYPE,
      routingBucket = 0,
      persistent = false,
      metadata,
    } = options

    const npcId = id ?? uuid()
    if (this.npcById.has(npcId)) {
      return {
        result: {
          success: false,
          error: `NPC '${npcId}' already exists`,
        },
      }
    }

    const modelHash = typeof model === 'string' ? this.hasher.getHashKey(model) : model
    const handle = this.pedServer.create(
      pedType,
      modelHash,
      position.x,
      position.y,
      position.z,
      heading,
      networked,
    )

    if (!handle || handle <= 0) {
      return {
        result: {
          success: false,
          error: 'Failed to create NPC ped entity',
        },
      }
    }

    const spawnOk = await this.waitForSpawn(handle)
    if (!spawnOk) {
      this.safeDeleteHandle(handle)
      return {
        result: {
          success: false,
          error: `NPC spawn timed out after ${DEFAULT_SPAWN_TIMEOUT_MS}ms`,
        },
      }
    }

    const resolvedModel = typeof model === 'string' ? model : modelHash.toString()
    const netId = networked ? this.resolveNetId(handle) : undefined
    const session: NpcSession = {
      id: npcId,
      handle,
      netId,
      model: resolvedModel,
      modelHash,
      persistent,
      routingBucket,
      createdAt: Date.now(),
    }

    const npc = new NPC(session, this.adapters)
    if (routingBucket !== 0) {
      npc.setRoutingBucket(routingBucket)
    }
    if (persistent) {
      this.entityServer.setOrphanMode(handle, 2)
    }

    if (metadata) {
      for (const [key, value] of Object.entries(metadata)) {
        npc.setMeta(key, value)
      }
    }

    this.npcById.set(npcId, npc)
    this.idByHandle.set(handle, npcId)
    if (netId !== undefined) {
      this.idByNetId.set(netId, npcId)
    }
    this.world.add(npc)

    coreLogger.info('NPC created', {
      npcId,
      handle,
      netId,
      model: resolvedModel,
      persistent,
      routingBucket,
      totalNpcs: this.npcById.size,
    })

    this.events.emit('opencore:npc:created', 'all', npc.serialize())

    return {
      result: {
        success: true,
        id: npcId,
        handle,
        netId,
      },
      npc,
    }
  }

  async createMany(options: NpcSpawnOptions[]): Promise<Array<{ result: NpcSpawnResult; npc?: NPC }>> {
    const result: Array<{ result: NpcSpawnResult; npc?: NPC }> = []
    for (const item of options) {
      result.push(await this.create(item))
    }
    return result
  }

  getById(id: string): NPC | undefined {
    return this.npcById.get(id)
  }

  getByHandle(handle: number): NPC | undefined {
    const id = this.idByHandle.get(handle)
    return id ? this.npcById.get(id) : undefined
  }

  getByNetId(netId: number): NPC | undefined {
    const id = this.idByNetId.get(netId)
    return id ? this.npcById.get(id) : undefined
  }

  getAll(): NPC[] {
    return Array.from(this.npcById.values())
  }

  getInRoutingBucket(bucket: number): NPC[] {
    const npcs: NPC[] = []
    for (const npc of this.npcById.values()) {
      if (npc.dimension === bucket) {
        npcs.push(npc)
      }
    }
    return npcs
  }

  findNear(position: Vector3, radius: number, bucket?: number): NPC[] {
    const maxDistance = Math.max(0, radius)
    const maxDistanceSq = maxDistance * maxDistance
    const npcs: NPC[] = []

    for (const npc of this.npcById.values()) {
      if (!npc.exists) continue
      if (bucket !== undefined && npc.dimension !== bucket) continue

      const npcPos = npc.getPosition()
      const dx = npcPos.x - position.x
      const dy = npcPos.y - position.y
      const dz = npcPos.z - position.z
      const distSq = dx * dx + dy * dy + dz * dz
      if (distSq <= maxDistanceSq) {
        npcs.push(npc)
      }
    }

    return npcs
  }

  count(): number {
    return this.npcById.size
  }

  exists(id: string): boolean {
    const npc = this.npcById.get(id)
    return npc ? npc.exists : false
  }

  deleteById(id: string): boolean {
    const npc = this.npcById.get(id)
    if (!npc) {
      return false
    }

    npc.delete()
    this.removeFromRegistry(npc)

    coreLogger.info('NPC deleted', {
      npcId: npc.npcId,
      handle: npc.handle,
      netId: npc.netId,
      remainingNpcs: this.npcById.size,
    })

    this.events.emit('opencore:npc:deleted', 'all', npc.npcId)

    return true
  }

  deleteByHandle(handle: number): boolean {
    const id = this.idByHandle.get(handle)
    if (!id) return false
    return this.deleteById(id)
  }

  deleteByNetId(netId: number): boolean {
    const id = this.idByNetId.get(netId)
    if (!id) return false
    return this.deleteById(id)
  }

  deleteAll(): number {
    const ids = Array.from(this.npcById.keys())
    let deleted = 0

    for (const id of ids) {
      if (this.deleteById(id)) {
        deleted++
      }
    }

    return deleted
  }

  cleanupOrphans(): number {
    const toDelete: string[] = []
    for (const npc of this.npcById.values()) {
      if (!npc.exists) {
        toDelete.push(npc.npcId)
      }
    }

    for (const id of toDelete) {
      const npc = this.npcById.get(id)
      if (!npc) continue
      this.removeFromRegistry(npc)
      coreLogger.debug('Cleaned up orphaned NPC', { npcId: id })
    }

    if (toDelete.length > 0) {
      coreLogger.info('NPC cleanup completed', {
        cleaned: toDelete.length,
        remaining: this.npcById.size,
      })
    }

    return toDelete.length
  }

  serializeAll(): SerializedNpcData[] {
    return Array.from(this.npcById.values()).map((npc) => npc.serialize())
  }

  private resolveNetId(handle: number): number | undefined {
    const netId = this.pedServer.getNetworkIdFromEntity(handle)
    return netId > 0 ? netId : undefined
  }

  private removeFromRegistry(npc: NPC): void {
    this.npcById.delete(npc.npcId)
    this.idByHandle.delete(npc.handle)
    if (npc.netId !== undefined) {
      this.idByNetId.delete(npc.netId)
    }
    this.world.remove(npc.id)
  }

  private safeDeleteHandle(handle: number): void {
    try {
      if (this.entityServer.doesExist(handle)) {
        this.pedServer.delete(handle)
      }
    } catch (error: unknown) {
      coreLogger.warn('Failed to cleanup NPC handle after spawn failure', {
        handle,
        error: error instanceof Error ? error.message : String(error),
      })
    }
  }

  private async waitForSpawn(handle: number, timeoutMs: number = DEFAULT_SPAWN_TIMEOUT_MS): Promise<boolean> {
    const startedAt = Date.now()
    while (!this.entityServer.doesExist(handle)) {
      if (Date.now() - startedAt > timeoutMs) {
        return false
      }
      await sleep(0)
    }
    return true
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}