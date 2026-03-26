import { inject, injectable } from 'tsyringe'
import { v4 as uuid } from 'uuid'
import { IHasher } from '../../../adapters/contracts/IHasher'
import { EventsAPI } from '../../../adapters/contracts/transport/events.api'
import { IEntityServer } from '../../../adapters/contracts/server/IEntityServer'
import { INpcLifecycleServer } from '../../../adapters/contracts/server/npc-lifecycle/INpcLifecycleServer'
import { IPedServer } from '../../../adapters/contracts/server/IPedServer'
import { coreLogger } from '../../../kernel/logger'
import { Vector3 } from '../../../kernel/utils/vector3'
import { WorldContext } from '../../core/world'
import { SYSTEM_EVENTS } from '../../shared/types/system-types'
import { NPC, NpcAdapters, NpcSession } from '../entities/npc'
import { NpcSpawnOptions, NpcSpawnResult, SerializedNpcData } from '../types/npc.types'

/**
 * Server-side API responsible for the full NPC (ped) lifecycle:
 * spawn, registry, queries, spatial search, serialization and deletion.
 *
 * @remarks
 * Prefer consuming this API from gameplay / AI systems instead of calling natives directly.
 * This class keeps a stable in-memory registry keyed by `npcId` and maintains secondary
 * indexes by `handle` and (when networked) by `netId`.
 *
 * The registry is authoritative for lookups, while `NPC.exists` reflects runtime existence.
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
    @inject(INpcLifecycleServer as any) private readonly npcLifecycle: INpcLifecycleServer,
    @inject(IPedServer as any) private readonly pedServer: IPedServer,
    @inject(IHasher as any) private readonly hasher: IHasher,
    @inject(EventsAPI as any) private readonly events: EventsAPI<'server'>,
  ) {
    this.adapters = {
      entityServer: this.entityServer,
      pedServer: this.pedServer,
      npcLifecycle: this.npcLifecycle,
    }
  }

  /**
   * Spawn (create) a single NPC and register it into the runtime.
   *
   * @remarks
   * - Generates a UUID if `options.id` is not provided.
   * - Prevents duplicate `npcId` collisions within this runtime.
   * - Waits until the underlying entity exists (polling) and fails fast on timeout.
   * - Applies routing bucket, orphan mode (persistent), and metadata after spawn.
   * - Registers the NPC in `WorldContext` and internal indexes.
   *
   * @param options - Spawn options (model, position, routingBucket, persistence, metadata, etc.).
   * @returns An object containing a `result` (success/error) and the created `npc` on success.
   */
  async create(options: NpcSpawnOptions): Promise<{ result: NpcSpawnResult; npc?: NPC }> {
    const {
      id,
      model,
      position,
      heading = 0,
      networked = true,
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
    let lifecycleResult: { handle: number; netId?: number }
    try {
      lifecycleResult = await Promise.resolve(
        this.npcLifecycle.create({
          model: typeof model === 'string' ? model : String(model),
          modelHash,
          position,
          heading,
          networked,
          routingBucket,
          persistent,
        }),
      )
    } catch (error: unknown) {
      return {
        result: {
          success: false,
          error: error instanceof Error ? error.message : 'Failed to create NPC ped entity',
        },
      }
    }

    const handle = lifecycleResult.handle
    const resolvedModel = typeof model === 'string' ? model : modelHash.toString()
    const netId = lifecycleResult.netId
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

    // this.events.emit('opencore:npc:created', 'all', npc.serialize())

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

  /**
   * Spawn multiple NPCs sequentially using {@link create}.
   *
   * @remarks
   * This method is intentionally sequential to keep spawn load predictable and to preserve
   * deterministic side-effects (logging, indexing, world registration).
   *
   * If you want parallel spawning, you can build it externally, but be mindful of server load
   * and potential native limits.
   *
   * @param options - List of spawn requests.
   * @returns A list of per-item results, each containing a `result` and optionally an `npc`.
   */
  async createMany(
    options: NpcSpawnOptions[],
  ): Promise<Array<{ result: NpcSpawnResult; npc?: NPC }>> {
    const result: Array<{ result: NpcSpawnResult; npc?: NPC }> = []
    for (const item of options) {
      result.push(await this.create(item))
    }
    return result
  }

  /**
   * Get an NPC instance by its logical id (`npcId`).
   *
   * @param id - NPC logical identifier.
   * @returns The NPC instance if present in the registry, otherwise `undefined`.
   */
  getById(id: string): NPC | undefined {
    return this.npcById.get(id)
  }

  /**
   * Get an NPC instance by its ped handle.
   *
   * @remarks
   * Handles are runtime-specific and can become invalid if the entity is removed.
   * This lookup uses the internal `handle -> npcId` index.
   *
   * @param handle - Ped handle.
   * @returns The NPC instance if present, otherwise `undefined`.
   */
  getByHandle(handle: number): NPC | undefined {
    const id = this.idByHandle.get(handle)
    return id ? this.npcById.get(id) : undefined
  }

  /**
   * Get an NPC instance by its network id (netId).
   *
   * @remarks
   * Only NPCs created with `networked=true` will have a netId and be indexed here.
   *
   * @param netId - Network id of the entity.
   * @returns The NPC instance if present, otherwise `undefined`.
   */
  getByNetId(netId: number): NPC | undefined {
    const id = this.idByNetId.get(netId)
    return id ? this.npcById.get(id) : undefined
  }

  /**
   * Return a snapshot array of all NPCs currently registered.
   *
   * @remarks
   * This includes NPCs that may no longer exist at runtime (e.g. removed externally),
   * until {@link cleanupOrphans} is called.
   *
   * @returns An array of NPC instances.
   */
  getAll(): NPC[] {
    return Array.from(this.npcById.values())
  }

  /**
   * Return all NPCs whose current routing bucket (dimension) matches the given bucket.
   *
   * @remarks
   * The check is performed using `npc.dimension` (which resolves via entity server).
   *
   * @param bucket - Routing bucket / dimension.
   * @returns An array of NPC instances in the given bucket.
   */
  getInRoutingBucket(bucket: number): NPC[] {
    const npcs: NPC[] = []
    for (const npc of this.npcById.values()) {
      if (npc.dimension === bucket) {
        npcs.push(npc)
      }
    }
    return npcs
  }

  /**
   * Find NPCs within `radius` of a position (Euclidean distance in 3D).
   *
   * @remarks
   * - This method performs a linear scan over registered NPCs.
   * - Uses squared distance (avoids `Math.sqrt`) for performance.
   * - Skips NPCs that no longer exist (`npc.exists === false`).
   * - Optionally filters by routing bucket (dimension).
   *
   * @param position - Center position.
   * @param radius - Search radius (negative values are clamped to 0).
   * @param bucket - Optional routing bucket filter.
   * @returns Matching NPCs (order is insertion/iteration order).
   */
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

  /**
   * Return the current number of NPCs tracked in the registry.
   *
   * @remarks
   * This is the registry size, not necessarily the number of NPCs that still exist in the world.
   * Use {@link cleanupOrphans} to remove non-existing NPCs from the registry.
   *
   * @returns Registry count.
   */
  count(): number {
    return this.npcById.size
  }

  /**
   * Check if a given `npcId` is registered and the underlying entity currently exists.
   *
   * @param id - NPC logical identifier.
   * @returns `true` if registered and exists in the runtime, otherwise `false`.
   */
  exists(id: string): boolean {
    const npc = this.npcById.get(id)
    return npc ? npc.exists : false
  }

  /**
   * Delete an NPC by its logical id and remove it from internal registries.
   *
   * @remarks
   * - Calls {@link NPC.delete} (ped deletion) if the entity exists.
   * - Removes the NPC from internal indexes and {@link WorldContext}.
   * - Emits the `opencore:npc:deleted` server event to `'all'` with the `npcId`.
   *
   * @param id - NPC logical identifier.
   * @returns `true` if an NPC was found and deleted, otherwise `false`.
   */
  deleteById(id: string): boolean {
    const npc = this.npcById.get(id)
    if (!npc) {
      return false
    }

    npc.delete()
    this.removeFromRegistry(npc)

    coreLogger.info('NPC deleted', {
      npcId: npc.npcId,
      handle: npc.getHandle(),
      netId: npc.netId,
      remainingNpcs: this.npcById.size,
    })

    this.events.emit(SYSTEM_EVENTS.npc.deleted, 'all', npc.npcId)

    return true
  }

  /**
   * Delete an NPC by its handle.
   *
   * @remarks
   * Resolves `handle -> npcId` and delegates to {@link deleteById}.
   *
   * @param handle - Ped handle.
   * @returns `true` if an NPC was found and deleted, otherwise `false`.
   */
  deleteByHandle(handle: number): boolean {
    const id = this.idByHandle.get(handle)
    if (!id) return false
    return this.deleteById(id)
  }

  /**
   * Delete an NPC by its network id (netId).
   *
   * @remarks
   * Resolves `netId -> npcId` and delegates to {@link deleteById}.
   * Only applies to NPCs created with `networked=true`.
   *
   * @param netId - Network id.
   * @returns `true` if an NPC was found and deleted, otherwise `false`.
   */
  deleteByNetId(netId: number): boolean {
    const id = this.idByNetId.get(netId)
    if (!id) return false
    return this.deleteById(id)
  }

  /**
   * Delete all currently registered NPCs.
   *
   * @remarks
   * Iterates over a snapshot of ids to avoid mutation issues during deletion.
   *
   * @returns The number of NPCs successfully deleted.
   */
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

  /**
   * Remove registry entries for NPCs whose underlying entities no longer exist.
   *
   * @remarks
   * This is useful when entities were deleted externally (by natives, scripts, cleanup, etc.).
   * It removes them from internal indexes and {@link WorldContext}, without attempting to delete
   * the already-nonexistent entity.
   *
   * @returns The number of orphan registry entries removed.
   */
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

  /**
   * Serialize all registered NPCs to plain data objects.
   *
   * @remarks
   * Each NPC serialization includes position, heading, routing bucket, metadata and state bag snapshot.
   * NPCs that no longer exist may still serialize, but values depending on natives could be stale or fail
   * depending on adapter behavior; prefer calling {@link cleanupOrphans} first when needed.
   *
   * @returns An array of serialized NPC data.
   */
  serializeAll(): SerializedNpcData[] {
    return Array.from(this.npcById.values()).map((npc) => npc.serialize())
  }

  private removeFromRegistry(npc: NPC): void {
    this.npcById.delete(npc.npcId)
    this.idByHandle.delete(npc.getHandle())
    if (npc.netId !== undefined) {
      this.idByNetId.delete(npc.netId)
    }
    this.world.remove(npc.id)
  }
}
