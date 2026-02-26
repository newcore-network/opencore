import { type EntityId } from '../../src/runtime/core/entity'

/**
 * Concrete entity for benchmarking purposes.
 * Extends BaseEntity without platform-specific dependencies.
 */
class BenchmarkEntity {
  readonly id: EntityId
  readonly kind: string
  private state = new Set<string>()
  private meta: Record<string, unknown> = {}
  protected _dimension = 0
  protected _streamDistance = 100

  constructor(id: EntityId) {
    this.id = id
    this.kind = id.split(':')[0]
  }

  add(state: string): void {
    this.state.add(state)
  }

  has(key: string): boolean {
    return this.state.has(key)
  }

  all(): string[] {
    return Array.from(this.state)
  }

  delete(key: string): void {
    this.state.delete(key)
  }

  clearStates(): void {
    this.state.clear()
  }

  toggle(state: string, force?: boolean): boolean {
    if (force !== undefined) {
      force ? this.add(state) : this.delete(state)
      return force
    }
    if (this.has(state)) {
      this.delete(state)
      return false
    }
    this.add(state)
    return true
  }

  setMeta<T = unknown>(key: string, value: T): void {
    this.meta[key] = value
  }

  getMeta<T = unknown>(key: string): T | undefined {
    return this.meta[key] as T | undefined
  }

  hasMeta(key: string): boolean {
    return key in this.meta
  }

  deleteMeta(key: string): void {
    delete this.meta[key]
  }

  getAllMeta(): Record<string, unknown> {
    return { ...this.meta }
  }

  clearMeta(): void {
    this.meta = {}
  }

  get dimension(): number {
    return this._dimension
  }

  set dimension(value: number) {
    this._dimension = value
  }

  get streamDistance(): number {
    return this._streamDistance
  }

  set streamDistance(value: number) {
    this._streamDistance = Math.max(0, value)
  }

  snapshot() {
    return {
      id: this.id,
      kind: this.kind,
      states: this.all(),
      meta: this.getAllMeta(),
      dimension: this._dimension,
      streamDistance: this._streamDistance,
    }
  }

  restore(snapshot: Partial<ReturnType<BenchmarkEntity['snapshot']>>): void {
    if (snapshot.states) {
      this.clearStates()
      for (const s of snapshot.states) {
        this.add(s)
      }
    }
    if (snapshot.meta) {
      this.meta = { ...snapshot.meta }
    }
    if (snapshot.dimension !== undefined) {
      this._dimension = snapshot.dimension
    }
    if (snapshot.streamDistance !== undefined) {
      this._streamDistance = snapshot.streamDistance
    }
  }
}

export type EntityComplexity = 'minimal' | 'simple' | 'complex' | 'heavy'

export class EntityFactory {
  private static counter = 0

  static create(complexity: EntityComplexity = 'simple'): BenchmarkEntity {
    const id = `entity:${EntityFactory.counter++}` as EntityId
    const entity = new BenchmarkEntity(id)

    switch (complexity) {
      case 'minimal':
        break

      case 'simple':
        entity.add('active')
        entity.setMeta('health', 100)
        entity.setMeta('name', `Entity-${EntityFactory.counter}`)
        break

      case 'complex':
        for (let i = 0; i < 10; i++) {
          entity.add(`state-${i}`)
        }
        for (let i = 0; i < 20; i++) {
          entity.setMeta(`key-${i}`, { value: i, nested: { data: `data-${i}` } })
        }
        entity.dimension = 5
        entity.streamDistance = 200
        break

      case 'heavy':
        for (let i = 0; i < 50; i++) {
          entity.add(`state-${i}`)
        }
        for (let i = 0; i < 100; i++) {
          entity.setMeta(`key-${i}`, {
            value: i,
            position: { x: Math.random() * 1000, y: Math.random() * 1000, z: 72.0 },
            inventory: Array.from({ length: 10 }, (_, j) => ({ id: j, name: `Item${j}` })),
          })
        }
        entity.dimension = 10
        entity.streamDistance = 500
        break
    }

    return entity
  }

  static createMany(count: number, complexity: EntityComplexity = 'simple'): BenchmarkEntity[] {
    return Array.from({ length: count }, () => EntityFactory.create(complexity))
  }

  static reset(): void {
    EntityFactory.counter = 0
  }
}
