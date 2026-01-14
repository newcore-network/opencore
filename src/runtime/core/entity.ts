export type EntityId = `${string}:${string | number}`

export abstract class BaseEntity {
  readonly id: EntityId
  private state = new Map<string, unknown>()

  constructor(id: EntityId) {
    this.id = id
  }

  get<T>(key: string): T | undefined {
    return this.state.get(key) as T | undefined
  }

  set<T>(key: string, value: T) {
    this.state.set(key, value)
  }

  has(key: string): boolean {
    return this.state.has(key)
  }

  delete(key: string) {
    this.state.delete(key)
  }

  snapshot(): Record<string, unknown> {
    return Object.fromEntries(this.state.entries())
  }
}
