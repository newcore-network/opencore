import { inject, injectable } from 'tsyringe'
import { Vector3 } from '../../../kernel/utils/vector3'
import {
  type ClientPedAnimationOptions as PedAnimationOptions,
  type ClientPedSpawnOptions as PedSpawnOptions,
  IClientPedPort,
} from '../../../adapters/contracts/client/ped/IClientPedPort'
import { IClientLocalPlayerBridge } from '../adapter/local-player-bridge'

export type { PedSpawnOptions, PedAnimationOptions }

export interface ManagedPed {
  id: string
  handle: number
  model: string
  position: Vector3
}

@injectable()
export class PedService {
  private peds: Map<string, ManagedPed> = new Map()
  private idCounter = 0

  constructor(
    @inject(IClientPedPort as any) private readonly pedsPort: IClientPedPort,
    @inject(IClientLocalPlayerBridge as any) private readonly localPlayer: IClientLocalPlayerBridge,
  ) {}

  async spawn(options: PedSpawnOptions): Promise<{ id: string; handle: number }> {
    const ped = await this.pedsPort.spawn(options)
    if (!ped || ped === 0) throw new Error('Failed to create ped')

    const id = `ped_${++this.idCounter}`
    this.peds.set(id, { id, handle: ped, model: options.model, position: options.position })
    return { id, handle: ped }
  }

  delete(id: string): boolean {
    const ped = this.peds.get(id)
    if (!ped) return false
    this.pedsPort.delete(ped.handle)
    this.peds.delete(id)
    return true
  }

  deleteByHandle(handle: number): void {
    this.pedsPort.delete(handle)
    for (const [id, ped] of this.peds) {
      if (ped.handle === handle) {
        this.peds.delete(id)
        break
      }
    }
  }

  deleteAll(): void {
    for (const ped of this.peds.values()) {
      this.pedsPort.delete(ped.handle)
    }
    this.peds.clear()
  }

  async playAnimation(handle: number, options: PedAnimationOptions): Promise<void> {
    await this.pedsPort.playAnimation(handle, options)
  }

  stopAnimation(handle: number): void {
    this.pedsPort.stopAnimation(handle)
  }

  stopAnimationImmediately(handle: number): void {
    this.pedsPort.stopAnimationImmediately(handle)
  }

  freeze(handle: number, freeze: boolean): void {
    this.pedsPort.freeze(handle, freeze)
  }

  setInvincible(handle: number, invincible: boolean): void {
    this.pedsPort.setInvincible(handle, invincible)
  }

  giveWeapon(handle: number, weapon: string, ammo = 100, hidden = false, forceInHand = true): void {
    this.pedsPort.giveWeapon(handle, weapon, ammo, hidden, forceInHand)
  }

  removeAllWeapons(handle: number): void {
    this.pedsPort.removeAllWeapons(handle)
  }

  getClosest(radius = 10.0, excludePlayer = true): number | null {
    const playerPed = this.localPlayer.getHandle()
    const handle = this.pedsPort.getClosest(radius, excludePlayer)
    if (!handle) return null
    if (excludePlayer && handle === playerPed) return null
    return handle
  }

  getNearby(position: Vector3, radius: number, excludePlayer = true): number[] {
    return this.pedsPort.getNearby(
      position,
      radius,
      excludePlayer ? this.localPlayer.getHandle() : undefined,
    )
  }

  lookAtEntity(handle: number, entity: number, duration = -1): void {
    this.pedsPort.lookAtEntity(handle, entity, duration)
  }

  lookAtCoords(handle: number, position: Vector3, duration = -1): void {
    this.pedsPort.lookAtCoords(handle, position, duration)
  }

  walkTo(handle: number, position: Vector3, speed = 1.0): void {
    this.pedsPort.walkTo(handle, position, speed)
  }

  setCombatAttributes(handle: number, canFight: boolean, canUseCover = true): void {
    this.pedsPort.setCombatAttributes(handle, canFight, canUseCover)
  }

  get(id: string): ManagedPed | undefined {
    return this.peds.get(id)
  }
  getAll(): ManagedPed[] {
    return Array.from(this.peds.values())
  }
  exists(id: string): boolean {
    const ped = this.peds.get(id)
    return ped ? this.pedsPort.exists(ped.handle) : false
  }
}
