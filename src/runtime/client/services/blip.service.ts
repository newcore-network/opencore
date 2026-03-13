import { inject, injectable } from 'tsyringe'
import { Vector3 } from '../../../kernel/utils/vector3'
import { IClientPlatformBridge } from '../adapter/platform-bridge'

export interface BlipOptions {
  sprite?: number
  color?: number
  scale?: number
  shortRange?: boolean
  label?: string
  display?: number
  category?: number
  flash?: boolean
  alpha?: number
  route?: boolean
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

@injectable()
export class BlipService {
  private blips: Map<string, ManagedBlip> = new Map()
  private idCounter = 0

  constructor(
    @inject(IClientPlatformBridge as any) private readonly platform: IClientPlatformBridge,
  ) {}

  create(position: Vector3, options: BlipOptions = {}): string {
    const id = `blip_${++this.idCounter}`
    const opts = { ...DEFAULT_OPTIONS, ...options }
    const handle = this.platform.addBlipForCoord(position)
    this.applyOptions(handle, opts)
    this.blips.set(id, { id, handle, position, options: opts })
    return id
  }

  createForEntity(entity: number, options: BlipOptions = {}): string {
    const id = `blip_${++this.idCounter}`
    const opts = { ...DEFAULT_OPTIONS, ...options }
    const handle = this.platform.addBlipForEntity(entity)
    this.applyOptions(handle, opts)
    const position = this.platform.getEntityCoords(entity)
    this.blips.set(id, { id, handle, position, options: opts })
    return id
  }

  createForRadius(position: Vector3, radius: number, options: BlipOptions = {}): string {
    const id = `blip_${++this.idCounter}`
    const opts = { ...DEFAULT_OPTIONS, ...options }
    const handle = this.platform.addBlipForRadius(position, radius)
    this.applyOptions(handle, opts)
    this.blips.set(id, { id, handle, position, options: opts })
    return id
  }

  remove(id: string): boolean {
    const blip = this.blips.get(id)
    if (!blip) return false
    if (this.platform.doesBlipExist(blip.handle)) this.platform.removeBlip(blip.handle)
    this.blips.delete(id)
    return true
  }

  removeAll(): void {
    for (const blip of this.blips.values()) {
      if (this.platform.doesBlipExist(blip.handle)) this.platform.removeBlip(blip.handle)
    }
    this.blips.clear()
  }

  update(id: string, options: Partial<BlipOptions>): boolean {
    const blip = this.blips.get(id)
    if (!blip || !this.platform.doesBlipExist(blip.handle)) return false
    blip.options = { ...blip.options, ...options }
    this.applyOptions(blip.handle, blip.options)
    return true
  }

  setPosition(id: string, position: Vector3): boolean {
    const blip = this.blips.get(id)
    if (!blip || !this.platform.doesBlipExist(blip.handle)) return false
    this.platform.setBlipCoords(blip.handle, position)
    blip.position = position
    return true
  }

  setRoute(id: string, enabled: boolean, color?: number): boolean {
    const blip = this.blips.get(id)
    if (!blip || !this.platform.doesBlipExist(blip.handle)) return false
    this.platform.setBlipRoute(blip.handle, enabled)
    if (color !== undefined) this.platform.setBlipRouteColour(blip.handle, color)
    return true
  }

  get(id: string): ManagedBlip | undefined {
    return this.blips.get(id)
  }
  getAll(): ManagedBlip[] {
    return Array.from(this.blips.values())
  }
  getHandle(id: string): number | undefined {
    return this.blips.get(id)?.handle
  }
  exists(id: string): boolean {
    const blip = this.blips.get(id)
    return blip ? this.platform.doesBlipExist(blip.handle) : false
  }

  private applyOptions(handle: number, options: BlipOptions): void {
    if (options.sprite !== undefined) this.platform.setBlipSprite(handle, options.sprite)
    if (options.color !== undefined) this.platform.setBlipColour(handle, options.color)
    if (options.scale !== undefined) this.platform.setBlipScale(handle, options.scale)
    if (options.shortRange !== undefined)
      this.platform.setBlipAsShortRange(handle, options.shortRange)
    if (options.label) this.platform.setBlipName(handle, options.label)
    if (options.display !== undefined) this.platform.setBlipDisplay(handle, options.display)
    if (options.category !== undefined) this.platform.setBlipCategory(handle, options.category)
    if (options.flash !== undefined) this.platform.setBlipFlashes(handle, options.flash)
    if (options.alpha !== undefined) this.platform.setBlipAlpha(handle, options.alpha)
    if (options.route !== undefined) {
      this.platform.setBlipRoute(handle, options.route)
      if (options.routeColor !== undefined)
        this.platform.setBlipRouteColour(handle, options.routeColor)
    }
  }
}
