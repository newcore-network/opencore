import { inject, injectable } from 'tsyringe'
import { Vector3 } from '../../../kernel/utils/vector3'
import {
  IClientBlipBridge,
  type ClientBlipDefinition,
  type ClientBlipOptions as BlipOptions,
} from '../../../adapters/contracts/client/ui/IClientBlipBridge'

export interface ManagedBlip {
  id: string
  definition: ClientBlipDefinition
}

const DEFAULT_OPTIONS: BlipOptions = {
  icon: 1,
  color: 1,
  scale: 1.0,
  shortRange: true,
  alpha: 255,
  route: false,
  visible: true,
}

@injectable()
export class BlipService {
  private blips: Map<string, ManagedBlip> = new Map()
  private idCounter = 0

  constructor(@inject(IClientBlipBridge as any) private readonly bridge: IClientBlipBridge) {}

  create(position: Vector3, options: BlipOptions = {}): string {
    const id = `blip_${++this.idCounter}`
    const definition = this.buildDefinition({ position }, options)
    this.bridge.create(id, definition)
    this.blips.set(id, { id, definition })
    return id
  }

  createForEntity(entity: number, options: BlipOptions = {}): string {
    const id = `blip_${++this.idCounter}`
    const definition = this.buildDefinition({ entity }, options)
    this.bridge.create(id, definition)
    this.blips.set(id, { id, definition })
    return id
  }

  createForRadius(position: Vector3, radius: number, options: BlipOptions = {}): string {
    const id = `blip_${++this.idCounter}`
    const definition = this.buildDefinition({ position, radius }, options)
    this.bridge.create(id, definition)
    this.blips.set(id, { id, definition })
    return id
  }

  remove(id: string): boolean {
    const removed = this.bridge.remove(id)
    if (removed) this.blips.delete(id)
    return removed
  }

  removeAll(): void {
    this.bridge.clear()
    this.blips.clear()
  }

  update(id: string, options: Partial<BlipOptions>): boolean {
    const blip = this.blips.get(id)
    if (!blip) return false
    const patch = this.normalizeOptions(options)
    const updated = this.bridge.update(id, patch)
    if (!updated) return false
    blip.definition = { ...blip.definition, ...patch }
    return updated
  }

  setPosition(id: string, position: Vector3): boolean {
    const blip = this.blips.get(id)
    if (!blip) return false
    const updated = this.bridge.update(id, { position, entity: undefined, radius: undefined })
    if (!updated) return false
    blip.definition = { ...blip.definition, position, entity: undefined, radius: undefined }
    return updated
  }

  setRoute(id: string, enabled: boolean, color?: number): boolean {
    return this.update(id, { route: enabled, routeColor: color })
  }

  get(id: string): ManagedBlip | undefined {
    return this.blips.get(id)
  }
  getAll(): ManagedBlip[] {
    return Array.from(this.blips.values())
  }
  exists(id: string): boolean {
    return this.bridge.exists(id)
  }

  private buildDefinition(
    base: Partial<ClientBlipDefinition>,
    options: BlipOptions,
  ): ClientBlipDefinition {
    return {
      ...base,
      ...this.normalizeOptions({ ...DEFAULT_OPTIONS, ...options }),
    }
  }

  private normalizeOptions(options: Partial<BlipOptions>): Partial<ClientBlipDefinition> {
    const { sprite, icon, ...rest } = options
    return {
      ...rest,
      icon: icon ?? sprite,
    }
  }
}
