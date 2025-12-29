import { injectable } from 'tsyringe'
import { IEntityServer, type EntityStateBag } from '../contracts/IEntityServer'
import type { Vector3 } from '../../kernel/utils'

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
    const bag = this.stateBags.get(handle)!

    return {
      set: (key: string, value: unknown) => {
        bag.set(key, value)
      },
      get: (key: string) => {
        return bag.get(key)
      },
    }
  }

  // Test helper: Create a mock entity
  _createMockEntity(handle: number, model: number, coords: Vector3, heading = 0): void {
    this.entities.set(handle, { coords, heading, model, bucket: 0 })
  }
}
