import { Vector3 } from '@open-core/framework'
import { injectable } from 'tsyringe'
import {
  type EntityStateBag,
  IEntityServer,
  type SetPositionOptions,
} from '../contracts/server/IEntityServer'

/**
 * Node.js mock implementation of server-side entity operations.
 * Used for testing and standalone mode.
 */
@injectable()
export class NodeEntityServer extends IEntityServer {
  private entities = new Map<
    number,
    { coords: Vector3; heading: number; model: number; bucket: number }
  >()
  private stateBags = new Map<number, Map<string, unknown>>()

  doesExist(handle: number): boolean {
    return this.entities.has(handle)
  }

  getCoords(handle: number): Vector3 {
    return this.entities.get(handle)?.coords ?? { x: 0, y: 0, z: 0 }
  }

  setPosition(handle: number, position: Vector3, _options?: SetPositionOptions): void {
    const entity = this.entities.get(handle)
    if (entity) {
      entity.coords = { ...position }
    }
  }

  /**
   * @deprecated Use setPosition() for cross-platform compatibility.
   */
  setCoords(handle: number, x: number, y: number, z: number): void {
    const entity = this.entities.get(handle)
    if (entity) {
      entity.coords = { x, y, z }
    }
  }

  getHeading(handle: number): number {
    return this.entities.get(handle)?.heading ?? 0
  }

  setHeading(handle: number, heading: number): void {
    const entity = this.entities.get(handle)
    if (entity) {
      entity.heading = heading
    }
  }

  getModel(handle: number): number {
    return this.entities.get(handle)?.model ?? 0
  }

  delete(handle: number): void {
    this.entities.delete(handle)
    this.stateBags.delete(handle)
  }

  setOrphanMode(_handle: number, _mode: number): void {
    // No-op in Node
  }

  setRoutingBucket(handle: number, bucket: number): void {
    const entity = this.entities.get(handle)
    if (entity) {
      entity.bucket = bucket
    }
  }

  getRoutingBucket(handle: number): number {
    return this.entities.get(handle)?.bucket ?? 0
  }

  getStateBag(handle: number): EntityStateBag {
    if (!this.stateBags.has(handle)) {
      this.stateBags.set(handle, new Map())
    }
    const bag = this.stateBags.get(handle)
    if (!bag) {
      throw new Error(`[OpenCore] NodeEntityServer state bag missing for handle ${handle}`)
    }

    return {
      set: (key: string, value: unknown) => {
        bag.set(key, value)
      },
      get: (key: string) => {
        return bag.get(key)
      },
    }
  }

  getHealth(handle: number): number {
    const bag = this.getStateBag(handle)
    return (bag.get('health') as number) ?? 200
  }

  setHealth(handle: number, health: number): void {
    const bag = this.getStateBag(handle)
    bag.set('health', health, true)
  }

  getArmor(handle: number): number {
    const bag = this.getStateBag(handle)
    return (bag.get('armor') as number) ?? 0
  }

  setArmor(handle: number, armor: number): void {
    const bag = this.getStateBag(handle)
    bag.set('armor', armor, true)
  }

  // ─────────────────────────────────────────────────────────────────
  // Test Helpers
  // ─────────────────────────────────────────────────────────────────

  /**
   * Create a mock entity for testing.
   */
  _createMockEntity(handle: number, model: number, coords: Vector3, heading = 0): void {
    this.entities.set(handle, { coords, heading, model, bucket: 0 })
  }

  /**
   * Clear all mock entities.
   */
  _clearAll(): void {
    this.entities.clear()
    this.stateBags.clear()
  }
}
