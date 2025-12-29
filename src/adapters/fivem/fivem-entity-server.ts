import { injectable } from 'tsyringe'
import type { Vector3 } from '../../kernel/utils'
import { type EntityStateBag, IEntityServer } from '../contracts/IEntityServer'

/**
 * FiveM implementation of server-side entity operations.
 */
@injectable()
export class FiveMEntityServer extends IEntityServer {
  doesExist(handle: number): boolean {
    return DoesEntityExist(handle)
  }

  getCoords(handle: number): Vector3 {
    const coords = GetEntityCoords(handle)
    return { x: coords[0], y: coords[1], z: coords[2] }
  }

  setCoords(
    handle: number,
    x: number,
    y: number,
    z: number,
    alive = false,
    deadFlag = false,
    ragdollFlag = false,
    clearArea = true,
  ): void {
    SetEntityCoords(handle, x, y, z, alive, deadFlag, ragdollFlag, clearArea)
  }

  getHeading(handle: number): number {
    return GetEntityHeading(handle)
  }

  setHeading(handle: number, heading: number): void {
    SetEntityHeading(handle, heading)
  }

  getModel(handle: number): number {
    return GetEntityModel(handle)
  }

  delete(handle: number): void {
    DeleteEntity(handle)
  }

  setOrphanMode(handle: number, mode: number): void {
    SetEntityOrphanMode(handle, mode)
  }

  setRoutingBucket(handle: number, bucket: number): void {
    SetEntityRoutingBucket(handle, bucket)
  }

  getRoutingBucket(handle: number): number {
    return GetEntityRoutingBucket(handle)
  }

  getStateBag(handle: number): EntityStateBag {
    const stateBag = Entity(handle).state
    return {
      set: (key: string, value: unknown, replicated = true) => {
        stateBag.set(key, value, replicated)
      },
      get: (key: string) => {
        return stateBag[key]
      },
    }
  }

  getHealth(handle: number): number {
    const stateBag = Entity(handle).state
    return (stateBag.health as number) ?? 200
  }

  setHealth(handle: number, health: number): void {
    const stateBag = Entity(handle).state
    stateBag.set('health', health, true)
  }

  getArmor(handle: number): number {
    const stateBag = Entity(handle).state
    return (stateBag.armor as number) ?? 0
  }

  setArmor(handle: number, armor: number): void {
    const stateBag = Entity(handle).state
    stateBag.set('armor', armor, true)
  }
}
