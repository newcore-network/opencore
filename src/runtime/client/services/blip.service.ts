import { inject, injectable } from 'tsyringe'
import { Vector3 } from '../../../kernel/utils/vector3'
import {
  IClientBlipBridge,
  type ClientBlipOptions as BlipOptions,
} from '../../../adapters/contracts/client/ui/IClientBlipBridge'
import { IClientPlatformBridge } from '../adapter/platform-bridge'

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
    @inject(IClientBlipBridge as any) private readonly bridge: IClientBlipBridge,
    @inject(IClientPlatformBridge as any) private readonly platform: IClientPlatformBridge,
  ) {}

  create(position: Vector3, options: BlipOptions = {}): string {
    const id = `blip_${++this.idCounter}`
    const opts = { ...DEFAULT_OPTIONS, ...options }
    const handle = this.bridge.create(position)
    this.bridge.applyOptions(handle, opts)
    this.blips.set(id, { id, handle, position, options: opts })
    return id
  }

  createForEntity(entity: number, options: BlipOptions = {}): string {
    const id = `blip_${++this.idCounter}`
    const opts = { ...DEFAULT_OPTIONS, ...options }
    const handle = this.bridge.createForEntity(entity)
    this.bridge.applyOptions(handle, opts)
    const position = this.platform.getEntityCoords(entity)
    this.blips.set(id, { id, handle, position, options: opts })
    return id
  }

  createForRadius(position: Vector3, radius: number, options: BlipOptions = {}): string {
    const id = `blip_${++this.idCounter}`
    const opts = { ...DEFAULT_OPTIONS, ...options }
    const handle = this.bridge.createForRadius(position, radius)
    this.bridge.applyOptions(handle, opts)
    this.blips.set(id, { id, handle, position, options: opts })
    return id
  }

  remove(id: string): boolean {
    const blip = this.blips.get(id)
    if (!blip) return false
    if (this.bridge.exists(blip.handle)) this.bridge.remove(blip.handle)
    this.blips.delete(id)
    return true
  }

  removeAll(): void {
    for (const blip of this.blips.values()) {
      if (this.bridge.exists(blip.handle)) this.bridge.remove(blip.handle)
    }
    this.blips.clear()
  }

  update(id: string, options: Partial<BlipOptions>): boolean {
    const blip = this.blips.get(id)
    if (!blip || !this.bridge.exists(blip.handle)) return false
    blip.options = { ...blip.options, ...options }
    this.bridge.applyOptions(blip.handle, blip.options)
    return true
  }

  setPosition(id: string, position: Vector3): boolean {
    const blip = this.blips.get(id)
    if (!blip || !this.bridge.exists(blip.handle)) return false
    this.bridge.setPosition(blip.handle, position)
    blip.position = position
    return true
  }

  setRoute(id: string, enabled: boolean, color?: number): boolean {
    const blip = this.blips.get(id)
    if (!blip || !this.bridge.exists(blip.handle)) return false
    this.bridge.applyOptions(blip.handle, { route: enabled, routeColor: color })
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
    return blip ? this.bridge.exists(blip.handle) : false
  }
}
