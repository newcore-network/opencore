export type EntityId = `${string}:${string | number}`

export abstract class BaseEntity {
  readonly id: EntityId
  private state = new Set<string>()

  constructor(id: EntityId) {
    this.id = id
  }

  add(state: string) {
    this.state.add(state)
  }

  has(key: string): boolean {
    return this.state.has(key)
  }

  all(): string[] {
    return Array.from(this.state)
  }

  delete(key: string) {
    this.state.delete(key)
  }

  snapshot(): Record<string, unknown> {
    return Object.fromEntries(this.state.entries())
  }
}
