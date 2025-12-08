import { injectable } from 'tsyringe'
import type { Vector3 } from '../../utils'

export interface BlipOptions {
  /** Blip sprite ID (icon) */
  sprite?: number
  /** Blip color ID */
  color?: number
  /** Blip scale */
  scale?: number
  /** Short range blip (only visible nearby) */
  shortRange?: boolean
  /** Blip label/name */
  label?: string
  /** Display category (affects visibility on map) */
  display?: number
  /** Blip category */
  category?: number
  /** Flash the blip */
  flash?: boolean
  /** Blip alpha (0-255) */
  alpha?: number
  /** Route to this blip */
  route?: boolean
  /** Route color */
  routeColor?: number
}

export interface ManagedBlip {
  id: string
  handle: number
  position: Vector3
  options: BlipOptions
}

const DEFAULT_OPTIONS: BlipOptions = {
  sprite: 1,
  color: 1,
  scale: 1.0,
  shortRange: true,
  display: 4,
  category: 0,
  flash: false,
  alpha: 255,
  route: false,
}

/**
 * Service for creating and managing map blips.
 */
@injectable()
export class BlipService {
  private blips: Map<string, ManagedBlip> = new Map()
  private idCounter = 0

  /**
   * Create a blip at a world position.
   *
   * @param position - World position
   * @param options - Blip options
   * @returns The blip ID
   */
  create(position: Vector3, options: BlipOptions = {}): string {
    const id = `blip_${++this.idCounter}`
    const opts = { ...DEFAULT_OPTIONS, ...options }

    const handle = AddBlipForCoord(position.x, position.y, position.z)
    this.applyOptions(handle, opts)

    this.blips.set(id, { id, handle, position, options: opts })
    return id
  }

  /**
   * Create a blip attached to an entity.
   *
   * @param entity - Entity handle
   * @param options - Blip options
   * @returns The blip ID
   */
  createForEntity(entity: number, options: BlipOptions = {}): string {
    const id = `blip_${++this.idCounter}`
    const opts = { ...DEFAULT_OPTIONS, ...options }

    const handle = AddBlipForEntity(entity)
    this.applyOptions(handle, opts)

    const [x, y, z] = GetEntityCoords(entity, true)
    this.blips.set(id, { id, handle, position: { x, y, z }, options: opts })
    return id
  }

  /**
   * Create a blip for a radius/area.
   *
   * @param position - Center position
   * @param radius - Radius of the area
   * @param options - Blip options
   * @returns The blip ID
   */
  createForRadius(position: Vector3, radius: number, options: BlipOptions = {}): string {
    const id = `blip_${++this.idCounter}`
    const opts = { ...DEFAULT_OPTIONS, ...options }

    const handle = AddBlipForRadius(position.x, position.y, position.z, radius)
    this.applyOptions(handle, opts)

    this.blips.set(id, { id, handle, position, options: opts })
    return id
  }

  /**
   * Remove a blip by ID.
   *
   * @param id - The blip ID
   */
  remove(id: string): boolean {
    const blip = this.blips.get(id)
    if (!blip) return false

    if (DoesBlipExist(blip.handle)) {
      RemoveBlip(blip.handle)
    }

    this.blips.delete(id)
    return true
  }

  /**
   * Remove all managed blips.
   */
  removeAll(): void {
    for (const blip of this.blips.values()) {
      if (DoesBlipExist(blip.handle)) {
        RemoveBlip(blip.handle)
      }
    }
    this.blips.clear()
  }

  /**
   * Update blip options.
   *
   * @param id - The blip ID
   * @param options - New options to apply
   */
  update(id: string, options: Partial<BlipOptions>): boolean {
    const blip = this.blips.get(id)
    if (!blip || !DoesBlipExist(blip.handle)) return false

    blip.options = { ...blip.options, ...options }
    this.applyOptions(blip.handle, blip.options)
    return true
  }

  /**
   * Set blip position.
   *
   * @param id - The blip ID
   * @param position - New position
   */
  setPosition(id: string, position: Vector3): boolean {
    const blip = this.blips.get(id)
    if (!blip || !DoesBlipExist(blip.handle)) return false

    SetBlipCoords(blip.handle, position.x, position.y, position.z)
    blip.position = position
    return true
  }

  /**
   * Set whether a route should be drawn to the blip.
   *
   * @param id - The blip ID
   * @param enabled - Whether to show the route
   * @param color - Optional route color
   */
  setRoute(id: string, enabled: boolean, color?: number): boolean {
    const blip = this.blips.get(id)
    if (!blip || !DoesBlipExist(blip.handle)) return false

    SetBlipRoute(blip.handle, enabled)
    if (color !== undefined) {
      SetBlipRouteColour(blip.handle, color)
    }
    return true
  }

  /**
   * Get blip by ID.
   */
  get(id: string): ManagedBlip | undefined {
    return this.blips.get(id)
  }

  /**
   * Get all managed blips.
   */
  getAll(): ManagedBlip[] {
    return Array.from(this.blips.values())
  }

  /**
   * Get the native blip handle by ID.
   */
  getHandle(id: string): number | undefined {
    return this.blips.get(id)?.handle
  }

  /**
   * Check if a blip still exists in the game world.
   */
  exists(id: string): boolean {
    const blip = this.blips.get(id)
    return blip ? DoesBlipExist(blip.handle) : false
  }

  private applyOptions(handle: number, options: BlipOptions): void {
    if (options.sprite !== undefined) {
      SetBlipSprite(handle, options.sprite)
    }
    if (options.color !== undefined) {
      SetBlipColour(handle, options.color)
    }
    if (options.scale !== undefined) {
      SetBlipScale(handle, options.scale)
    }
    if (options.shortRange !== undefined) {
      SetBlipAsShortRange(handle, options.shortRange)
    }
    if (options.label) {
      BeginTextCommandSetBlipName('STRING')
      AddTextComponentString(options.label)
      EndTextCommandSetBlipName(handle)
    }
    if (options.display !== undefined) {
      SetBlipDisplay(handle, options.display)
    }
    if (options.category !== undefined) {
      SetBlipCategory(handle, options.category)
    }
    if (options.flash !== undefined) {
      SetBlipFlashes(handle, options.flash)
    }
    if (options.alpha !== undefined) {
      SetBlipAlpha(handle, options.alpha)
    }
    if (options.route !== undefined) {
      SetBlipRoute(handle, options.route)
      if (options.routeColor !== undefined) {
        SetBlipRouteColour(handle, options.routeColor)
      }
    }
  }
}
