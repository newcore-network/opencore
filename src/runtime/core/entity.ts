/**
 * Entity identifier format: `kind:id`
 * @example 'player:1', 'vehicle:42', 'npc:spawn-1'
 */
export type EntityId = `${string}:${string | number}`

/**
 * Entity metadata storage type.
 */
export type EntityMeta = Record<string, unknown>

/**
 * Base entity class for all game entities.
 *
 * @remarks
 * Provides common functionality for all entities in the game world:
 * - Unique identification
 * - State flags (active states like 'dead', 'frozen', etc.)
 * - Metadata storage
 * - Dimension/world support
 *
 * This class is platform-agnostic and should be extended by
 * platform-specific entity implementations.
 */
export abstract class BaseEntity {
  /**
   * Unique identifier for this entity.
   * Format: `kind:id` (e.g., 'player:1', 'vehicle:42')
   */
  readonly id: EntityId

  /**
   * Entity kind extracted from the ID.
   * @example 'player', 'vehicle', 'npc'
   */
  readonly kind: string

  /**
   * Active state flags.
   */
  private state = new Set<string>()

  /**
   * Transient metadata storage.
   */
  private meta: EntityMeta = {}

  /**
   * Current dimension/world ID.
   * 0 is the default shared world.
   */
  protected _dimension = 0

  /**
   * Stream distance for this entity.
   * Determines how far away players can see this entity.
   */
  protected _streamDistance = 100

  /**
   * Creates a new entity.
   * @param id - Unique entity identifier in format 'kind:id'
   */
  constructor(id: EntityId) {
    this.id = id
    this.kind = id.split(':')[0]
  }

  // ─────────────────────────────────────────────────────────────────
  // State Management
  // ─────────────────────────────────────────────────────────────────

  /**
   * Adds a state flag to the entity.
   * @param state - State identifier (e.g., 'dead', 'frozen', 'invisible')
   */
  add(state: string): void {
    this.state.add(state)
  }

  /**
   * Checks if the entity has a state flag.
   * @param key - State identifier to check
   */
  has(key: string): boolean {
    return this.state.has(key)
  }

  /**
   * Gets all active state flags.
   * @returns Array of state identifiers
   */
  all(): string[] {
    return Array.from(this.state)
  }

  /**
   * Removes a state flag from the entity.
   * @param key - State identifier to remove
   */
  delete(key: string): void {
    this.state.delete(key)
  }

  /**
   * Clears all state flags.
   */
  clearStates(): void {
    this.state.clear()
  }

  /**
   * Toggles a state flag.
   * @param state - State identifier
   * @param force - Optional force value (true = add, false = remove)
   * @returns The new state (true if added, false if removed)
   */
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

  // ─────────────────────────────────────────────────────────────────
  // Metadata Management
  // ─────────────────────────────────────────────────────────────────

  /**
   * Sets a metadata value.
   * @param key - Metadata key
   * @param value - Value to store
   */
  setMeta<T = unknown>(key: string, value: T): void {
    this.meta[key] = value
  }

  /**
   * Gets a metadata value.
   * @param key - Metadata key
   * @returns The stored value or undefined
   */
  getMeta<T = unknown>(key: string): T | undefined {
    return this.meta[key] as T | undefined
  }

  /**
   * Checks if a metadata key exists.
   * @param key - Metadata key
   */
  hasMeta(key: string): boolean {
    return key in this.meta
  }

  /**
   * Deletes a metadata value.
   * @param key - Metadata key
   */
  deleteMeta(key: string): void {
    delete this.meta[key]
  }

  /**
   * Gets all metadata.
   * @returns Copy of the metadata object
   */
  getAllMeta(): EntityMeta {
    return { ...this.meta }
  }

  /**
   * Clears all metadata.
   */
  clearMeta(): void {
    this.meta = {}
  }

  // ─────────────────────────────────────────────────────────────────
  // Dimension/World Support
  // ─────────────────────────────────────────────────────────────────

  /**
   * Gets the current dimension/world ID.
   *
   * @remarks
   * Override this in platform-specific implementations to sync
   * with the actual game engine dimension system.
   */
  get dimension(): number {
    return this._dimension
  }

  /**
   * Sets the dimension/world ID.
   *
   * @remarks
   * Override this in platform-specific implementations to sync
   * with the actual game engine dimension system.
   */
  set dimension(value: number) {
    this._dimension = value
  }

  // ─────────────────────────────────────────────────────────────────
  // Stream Distance
  // ─────────────────────────────────────────────────────────────────

  /**
   * Gets the stream distance for this entity.
   *
   * @remarks
   * Stream distance determines how far away players can see this entity.
   * Not all platforms support custom stream distances.
   */
  get streamDistance(): number {
    return this._streamDistance
  }

  /**
   * Sets the stream distance for this entity.
   */
  set streamDistance(value: number) {
    this._streamDistance = Math.max(0, value)
  }

  // ─────────────────────────────────────────────────────────────────
  // Serialization
  // ─────────────────────────────────────────────────────────────────

  /**
   * Creates a snapshot of the entity state.
   * @returns Plain object with entity data
   */
  snapshot(): EntitySnapshot {
    return {
      id: this.id,
      kind: this.kind,
      states: this.all(),
      meta: this.getAllMeta(),
      dimension: this._dimension,
      streamDistance: this._streamDistance,
    }
  }

  /**
   * Restores entity state from a snapshot.
   * @param snapshot - Snapshot to restore from
   */
  restore(snapshot: Partial<EntitySnapshot>): void {
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

/**
 * Entity snapshot for serialization.
 */
export interface EntitySnapshot {
  id: EntityId
  kind: string
  states: string[]
  meta: EntityMeta
  dimension: number
  streamDistance: number
}
