import { injectable } from 'tsyringe'
import type { Vector3 } from '../../../utils'

export interface PedSpawnOptions {
  /** Model name or hash */
  model: string
  /** Spawn position */
  position: Vector3
  /** Heading/rotation */
  heading?: number
  /** Network the ped */
  networked?: boolean
  /** Make the ped a mission entity */
  missionEntity?: boolean
  /** Relationship group */
  relationshipGroup?: string
  /** Whether to block non-temporary events */
  blockEvents?: boolean
}

export interface PedAnimationOptions {
  /** Animation dictionary */
  dict: string
  /** Animation name */
  anim: string
  /** Blend in speed */
  blendInSpeed?: number
  /** Blend out speed */
  blendOutSpeed?: number
  /** Duration (-1 for looped) */
  duration?: number
  /** Animation flags */
  flags?: number
  /** Playback rate */
  playbackRate?: number
}

export interface ManagedPed {
  id: string
  handle: number
  model: string
  position: Vector3
}

/**
 * Service for ped (NPC) operations and management.
 */
@injectable()
export class PedService {
  private peds: Map<string, ManagedPed> = new Map()
  private idCounter = 0

  /**
   * Spawn a ped at a position.
   *
   * @param options - Spawn options
   * @returns The ped ID and handle
   */
  async spawn(options: PedSpawnOptions): Promise<{ id: string; handle: number }> {
    const {
      model,
      position,
      heading = 0,
      networked = false,
      missionEntity = true,
      blockEvents = true,
    } = options

    const modelHash = GetHashKey(model)

    // Load the model
    if (!IsModelInCdimage(modelHash) || !IsModelValid(modelHash)) {
      throw new Error(`Invalid ped model: ${model}`)
    }

    RequestModel(modelHash)
    while (!HasModelLoaded(modelHash)) {
      await new Promise((r) => setTimeout(r, 0))
    }

    // Create the ped
    const ped = CreatePed(4, modelHash, position.x, position.y, position.z, heading, networked, true)

    SetModelAsNoLongerNeeded(modelHash)

    if (!ped || ped === 0) {
      throw new Error('Failed to create ped')
    }

    // Configure the ped
    if (missionEntity) {
      SetEntityAsMissionEntity(ped, true, true)
    }

    if (blockEvents) {
      SetBlockingOfNonTemporaryEvents(ped, true)
    }

    // Set default relationship (neutral)
    SetPedRelationshipGroupHash(ped, GetHashKey('CIVMALE'))

    // Register in our map
    const id = `ped_${++this.idCounter}`
    this.peds.set(id, { id, handle: ped, model, position })

    return { id, handle: ped }
  }

  /**
   * Delete a ped by ID.
   *
   * @param id - The ped ID
   */
  delete(id: string): boolean {
    const ped = this.peds.get(id)
    if (!ped) return false

    if (DoesEntityExist(ped.handle)) {
      SetEntityAsMissionEntity(ped.handle, true, true)
      DeletePed(ped.handle)
    }

    this.peds.delete(id)
    return true
  }

  /**
   * Delete a ped by handle.
   *
   * @param handle - The ped handle
   */
  deleteByHandle(handle: number): void {
    if (DoesEntityExist(handle)) {
      SetEntityAsMissionEntity(handle, true, true)
      DeletePed(handle)
    }

    // Remove from our map if tracked
    for (const [id, ped] of this.peds) {
      if (ped.handle === handle) {
        this.peds.delete(id)
        break
      }
    }
  }

  /**
   * Delete all managed peds.
   */
  deleteAll(): void {
    for (const ped of this.peds.values()) {
      if (DoesEntityExist(ped.handle)) {
        SetEntityAsMissionEntity(ped.handle, true, true)
        DeletePed(ped.handle)
      }
    }
    this.peds.clear()
  }

  /**
   * Play an animation on a ped.
   *
   * @param handle - Ped handle
   * @param options - Animation options
   */
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

    if (!DoesEntityExist(handle)) return

    // Load anim dict
    RequestAnimDict(dict)
    while (!HasAnimDictLoaded(dict)) {
      await new Promise((r) => setTimeout(r, 0))
    }

    TaskPlayAnim(
      handle,
      dict,
      anim,
      blendInSpeed,
      blendOutSpeed,
      duration,
      flags,
      playbackRate,
      false,
      false,
      false,
    )
  }

  /**
   * Stop all animations on a ped.
   *
   * @param handle - Ped handle
   */
  stopAnimation(handle: number): void {
    if (!DoesEntityExist(handle)) return
    ClearPedTasks(handle)
  }

  /**
   * Stop animation immediately on a ped.
   *
   * @param handle - Ped handle
   */
  stopAnimationImmediately(handle: number): void {
    if (!DoesEntityExist(handle)) return
    ClearPedTasksImmediately(handle)
  }

  /**
   * Freeze a ped in place.
   *
   * @param handle - Ped handle
   * @param freeze - Whether to freeze
   */
  freeze(handle: number, freeze: boolean): void {
    if (!DoesEntityExist(handle)) return
    FreezeEntityPosition(handle, freeze)
  }

  /**
   * Set ped invincibility.
   *
   * @param handle - Ped handle
   * @param invincible - Whether invincible
   */
  setInvincible(handle: number, invincible: boolean): void {
    if (!DoesEntityExist(handle)) return
    SetEntityInvincible(handle, invincible)
  }

  /**
   * Give a weapon to a ped.
   *
   * @param handle - Ped handle
   * @param weapon - Weapon name/hash
   * @param ammo - Ammo count
   * @param hidden - Whether to hide the weapon
   * @param forceInHand - Whether to force weapon in hand
   */
  giveWeapon(handle: number, weapon: string, ammo = 100, hidden = false, forceInHand = true): void {
    if (!DoesEntityExist(handle)) return
    const weaponHash = GetHashKey(weapon)
    GiveWeaponToPed(handle, weaponHash, ammo, hidden, forceInHand)
  }

  /**
   * Remove all weapons from a ped.
   *
   * @param handle - Ped handle
   */
  removeAllWeapons(handle: number): void {
    if (!DoesEntityExist(handle)) return
    RemoveAllPedWeapons(handle, true)
  }

  /**
   * Get the closest ped to the player.
   *
   * @param radius - Search radius
   * @param excludePlayer - Exclude the player ped
   * @returns Ped handle or null
   */
  getClosest(radius = 10.0, excludePlayer = true): number | null {
    const playerPed = PlayerPedId()
    const [px, py, pz] = GetEntityCoords(playerPed, true)

    const [found, handle] = GetClosestPed(px, py, pz, radius, true, true, true, false, -1)

    if (!found || handle === 0) return null
    if (excludePlayer && handle === playerPed) return null

    return handle
  }

  /**
   * Get all peds in a radius.
   *
   * @param position - Center position
   * @param radius - Search radius
   * @param excludePlayer - Exclude the player ped
   * @returns Array of ped handles
   */
  getNearby(position: Vector3, radius: number, excludePlayer = true): number[] {
    const peds: number[] = []
    const playerPed = PlayerPedId()

    const [handle, _] = FindFirstPed(0)
    let ped = handle

    do {
      if (!DoesEntityExist(ped)) continue
      if (excludePlayer && ped === playerPed) continue

      const [ex, ey, ez] = GetEntityCoords(ped, true)
      const dist = Math.sqrt(
        Math.pow(ex - position.x, 2) + Math.pow(ey - position.y, 2) + Math.pow(ez - position.z, 2),
      )

      if (dist <= radius) {
        peds.push(ped)
      }
    } while (FindNextPed(handle, ped))

    EndFindPed(handle)
    return peds
  }

  /**
   * Make ped look at entity.
   *
   * @param handle - Ped handle
   * @param entity - Entity to look at
   * @param duration - Duration in ms (-1 for infinite)
   */
  lookAtEntity(handle: number, entity: number, duration = -1): void {
    if (!DoesEntityExist(handle)) return
    TaskLookAtEntity(handle, entity, duration, 2048, 3)
  }

  /**
   * Make ped look at position.
   *
   * @param handle - Ped handle
   * @param position - Position to look at
   * @param duration - Duration in ms (-1 for infinite)
   */
  lookAtCoords(handle: number, position: Vector3, duration = -1): void {
    if (!DoesEntityExist(handle)) return
    TaskLookAtCoord(handle, position.x, position.y, position.z, duration, 2048, 3)
  }

  /**
   * Make ped walk to position.
   *
   * @param handle - Ped handle
   * @param position - Target position
   * @param speed - Walking speed (1.0 = walk, 2.0 = run)
   */
  walkTo(handle: number, position: Vector3, speed = 1.0): void {
    if (!DoesEntityExist(handle)) return
    TaskGoStraightToCoord(handle, position.x, position.y, position.z, speed, -1, 0.0, 0.0)
  }

  /**
   * Set ped combat attributes.
   *
   * @param handle - Ped handle
   * @param canFight - Whether the ped can fight
   * @param canUseCover - Whether the ped can use cover
   */
  setCombatAttributes(handle: number, canFight: boolean, canUseCover = true): void {
    if (!DoesEntityExist(handle)) return
    SetPedCombatAttributes(handle, 46, canFight) // Can fight
    SetPedCombatAttributes(handle, 0, canUseCover) // Can use cover
  }

  /**
   * Get a managed ped by ID.
   */
  get(id: string): ManagedPed | undefined {
    return this.peds.get(id)
  }

  /**
   * Get all managed peds.
   */
  getAll(): ManagedPed[] {
    return Array.from(this.peds.values())
  }

  /**
   * Check if a managed ped still exists.
   */
  exists(id: string): boolean {
    const ped = this.peds.get(id)
    return ped ? DoesEntityExist(ped.handle) : false
  }
}

