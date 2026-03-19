import { inject, injectable } from 'tsyringe'
import { Vector3 } from '../../../kernel/utils/vector3'
import { IClientPlatformBridge } from '../adapter/platform-bridge'
import { IClientLocalPlayerBridge } from '../adapter/local-player-bridge'

export interface PedSpawnOptions {
  model: string
  position: Vector3
  heading?: number
  networked?: boolean
  missionEntity?: boolean
  relationshipGroup?: string
  blockEvents?: boolean
}

export interface PedAnimationOptions {
  dict: string
  anim: string
  blendInSpeed?: number
  blendOutSpeed?: number
  duration?: number
  flags?: number
  playbackRate?: number
}

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
    @inject(IClientPlatformBridge as any) private readonly platform: IClientPlatformBridge,
    @inject(IClientLocalPlayerBridge as any) private readonly localPlayer: IClientLocalPlayerBridge,
  ) {}

  async spawn(options: PedSpawnOptions): Promise<{ id: string; handle: number }> {
    const {
      model,
      position,
      heading = 0,
      networked = false,
      missionEntity = true,
      blockEvents = true,
    } = options

    const modelHash = this.platform.getHashKey(model)
    if (!this.platform.isModelInCdimage(modelHash) || !this.platform.isModelValid(modelHash)) {
      throw new Error(`Invalid ped model: ${model}`)
    }

    this.platform.requestModel(modelHash)
    while (!this.platform.hasModelLoaded(modelHash)) {
      await new Promise((r) => setTimeout(r, 0))
    }

    const ped = this.platform.createPed(4, modelHash, position, heading, networked, true)
    this.platform.setModelAsNoLongerNeeded(modelHash)
    if (!ped || ped === 0) throw new Error('Failed to create ped')

    if (missionEntity) this.platform.setEntityAsMissionEntity(ped, true, true)
    if (blockEvents) this.platform.setBlockingOfNonTemporaryEvents(ped, true)
    this.platform.setPedRelationshipGroupHash(ped, this.platform.getHashKey('CIVMALE'))

    const id = `ped_${++this.idCounter}`
    this.peds.set(id, { id, handle: ped, model, position })
    return { id, handle: ped }
  }

  delete(id: string): boolean {
    const ped = this.peds.get(id)
    if (!ped) return false
    if (this.platform.doesEntityExist(ped.handle)) {
      this.platform.setEntityAsMissionEntity(ped.handle, true, true)
      this.platform.deletePed(ped.handle)
    }
    this.peds.delete(id)
    return true
  }

  deleteByHandle(handle: number): void {
    if (this.platform.doesEntityExist(handle)) {
      this.platform.setEntityAsMissionEntity(handle, true, true)
      this.platform.deletePed(handle)
    }
    for (const [id, ped] of this.peds) {
      if (ped.handle === handle) {
        this.peds.delete(id)
        break
      }
    }
  }

  deleteAll(): void {
    for (const ped of this.peds.values()) {
      if (this.platform.doesEntityExist(ped.handle)) {
        this.platform.setEntityAsMissionEntity(ped.handle, true, true)
        this.platform.deletePed(ped.handle)
      }
    }
    this.peds.clear()
  }

  async playAnimation(handle: number, options: PedAnimationOptions): Promise<void> {
    const {
      dict,
      anim,
      blendInSpeed = 8.0,
      blendOutSpeed = -8.0,
      duration = -1,
      flags = 1,
      playbackRate = 0.0,
    } = options
    if (!this.platform.doesEntityExist(handle)) return
    this.platform.requestAnimDict(dict)
    while (!this.platform.hasAnimDictLoaded(dict)) {
      await new Promise((r) => setTimeout(r, 0))
    }
    this.platform.taskPlayAnim(
      handle,
      dict,
      anim,
      blendInSpeed,
      blendOutSpeed,
      duration,
      flags,
      playbackRate,
    )
  }

  stopAnimation(handle: number): void {
    if (!this.platform.doesEntityExist(handle)) return
    this.platform.clearPedTasks(handle)
  }

  stopAnimationImmediately(handle: number): void {
    if (!this.platform.doesEntityExist(handle)) return
    this.platform.clearPedTasksImmediately(handle)
  }

  freeze(handle: number, freeze: boolean): void {
    if (!this.platform.doesEntityExist(handle)) return
    this.platform.freezeEntityPosition(handle, freeze)
  }

  setInvincible(handle: number, invincible: boolean): void {
    if (!this.platform.doesEntityExist(handle)) return
    this.platform.setEntityInvincible(handle, invincible)
  }

  giveWeapon(handle: number, weapon: string, ammo = 100, hidden = false, forceInHand = true): void {
    if (!this.platform.doesEntityExist(handle)) return
    this.platform.giveWeaponToPed(
      handle,
      this.platform.getHashKey(weapon),
      ammo,
      hidden,
      forceInHand,
    )
  }

  removeAllWeapons(handle: number): void {
    if (!this.platform.doesEntityExist(handle)) return
    this.platform.removeAllPedWeapons(handle, true)
  }

  getClosest(radius = 10.0, excludePlayer = true): number | null {
    const playerPed = this.localPlayer.getHandle()
    const handle = this.platform.getClosestPed(this.localPlayer.getPosition(), radius)
    if (!handle) return null
    if (excludePlayer && handle === playerPed) return null
    return handle
  }

  getNearby(position: Vector3, radius: number, excludePlayer = true): number[] {
    return this.platform.getNearbyPeds(
      position,
      radius,
      excludePlayer ? this.localPlayer.getHandle() : undefined,
    )
  }

  lookAtEntity(handle: number, entity: number, duration = -1): void {
    if (!this.platform.doesEntityExist(handle)) return
    this.platform.taskLookAtEntity(handle, entity, duration)
  }

  lookAtCoords(handle: number, position: Vector3, duration = -1): void {
    if (!this.platform.doesEntityExist(handle)) return
    this.platform.taskLookAtCoord(handle, position, duration)
  }

  walkTo(handle: number, position: Vector3, speed = 1.0): void {
    if (!this.platform.doesEntityExist(handle)) return
    this.platform.taskGoStraightToCoord(handle, position, speed)
  }

  setCombatAttributes(handle: number, canFight: boolean, canUseCover = true): void {
    if (!this.platform.doesEntityExist(handle)) return
    this.platform.setPedCombatAttributes(handle, 46, canFight)
    this.platform.setPedCombatAttributes(handle, 0, canUseCover)
  }

  get(id: string): ManagedPed | undefined {
    return this.peds.get(id)
  }
  getAll(): ManagedPed[] {
    return Array.from(this.peds.values())
  }
  exists(id: string): boolean {
    const ped = this.peds.get(id)
    return ped ? this.platform.doesEntityExist(ped.handle) : false
  }
}
