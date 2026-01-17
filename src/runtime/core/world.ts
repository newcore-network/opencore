import { injectable } from 'tsyringe'
import { BaseEntity, EntityId } from './entity'

function getKind(id: EntityId): string {
  const i = id.indexOf(':')
  return i === -1 ? id : id.slice(0, i)
}

@injectable()
export class WorldContext {
  private entities = new Map<EntityId, BaseEntity>()
  private readonly kindIndex = new Map<string, number>()

  add(entity: BaseEntity) {
    // If replacing, remove first to keep index consistent
    const prev = this.entities.get(entity.id)
    if (prev) this.remove(entity.id)

    this.entities.set(entity.id, entity)

    const kind = getKind(entity.id)
    this.kindIndex.set(kind, (this.kindIndex.get(kind) ?? 0) + 1)
  }

  remove(id: EntityId) {
    const entity = this.entities.get(id)
    if (!entity) return

    const kind = getKind(id)
    const n = this.kindIndex.get(kind)
    if (n !== undefined) {
      if (n <= 1) this.kindIndex.delete(kind)
      else this.kindIndex.set(kind, n - 1)
    }

    this.entities.delete(id)
  }

  get<T extends BaseEntity = BaseEntity>(id: EntityId): T | undefined {
    return this.entities.get(id) as T | undefined
  }

  find<T extends BaseEntity>(predicate: (e: BaseEntity) => e is T): T[]
  find(predicate: (e: BaseEntity) => boolean): BaseEntity[]
  find(predicate: (e: BaseEntity) => boolean) {
    return [...this.entities.values()].filter(predicate)
  }

  all(): BaseEntity[] {
    return [...this.entities.values()]
  }

  size(): number {
    return this.entities.size
  }

  sizeBy(kind: string): number {
    return this.kindIndex.get(kind) ?? 0
  }
}
