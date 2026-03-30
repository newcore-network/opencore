import { inject, injectable } from 'tsyringe'
import { Vector3 } from '../../../kernel/utils/vector3'
import {
  IClientMarkerBridge,
  type ClientMarkerDefinition,
} from '../../../adapters/contracts/client/ui/IClientMarkerBridge'

export interface MarkerOptions {
  variant?: number
  type?: number
  size?: Vector3
  scale?: Vector3
  rotation?: Vector3
  color?: { r: number; g: number; b: number; a: number }
  bob?: boolean
  bobUpAndDown?: boolean
  faceCamera?: boolean
  rotate?: boolean
  drawOnEnts?: boolean
  visible?: boolean
}

export interface ManagedMarker {
  id: string
  definition: ClientMarkerDefinition
}

const DEFAULT_OPTIONS: Required<MarkerOptions> = {
  variant: 1,
  type: 1,
  size: { x: 1.0, y: 1.0, z: 1.0 },
  scale: { x: 1.0, y: 1.0, z: 1.0 },
  rotation: { x: 0, y: 0, z: 0 },
  color: { r: 255, g: 0, b: 0, a: 200 },
  bob: false,
  bobUpAndDown: false,
  faceCamera: false,
  rotate: false,
  drawOnEnts: false,
  visible: true,
}

@injectable()
export class MarkerService {
  private activeMarkers: Map<string, ManagedMarker> = new Map()
  private idCounter = 0

  constructor(@inject(IClientMarkerBridge as any) private readonly markers: IClientMarkerBridge) {}

  create(position: Vector3, options: MarkerOptions = {}): string {
    const id = `marker_${++this.idCounter}`
    const definition = this.buildDefinition(position, options)
    this.markers.create(id, definition)
    this.activeMarkers.set(id, {
      id,
      definition,
    })
    return id
  }

  remove(id: string): boolean {
    const removed = this.markers.remove(id)
    if (removed) this.activeMarkers.delete(id)
    return removed
  }

  removeAll(): void {
    this.markers.clear()
    this.activeMarkers.clear()
  }

  setPosition(id: string, position: Vector3): boolean {
    const marker = this.activeMarkers.get(id)
    if (!marker) return false
    const updated = this.markers.update(id, { position })
    if (!updated) return false
    marker.definition = { ...marker.definition, position }
    return updated
  }

  setOptions(id: string, options: Partial<MarkerOptions>): boolean {
    const marker = this.activeMarkers.get(id)
    if (!marker) return false
    const patch = this.normalizeOptions(options)
    const updated = this.markers.update(id, patch)
    if (!updated) return false
    marker.definition = { ...marker.definition, ...patch }
    return updated
  }

  setVisible(id: string, visible: boolean): boolean {
    return this.setOptions(id, { visible })
  }

  get(id: string): ManagedMarker | undefined {
    return this.activeMarkers.get(id)
  }
  getAll(): ManagedMarker[] {
    return Array.from(this.activeMarkers.values())
  }

  drawOnce(position: Vector3, options: MarkerOptions = {}): void {
    this.markers.draw(this.buildDefinition(position, options))
  }

  exists(id: string): boolean {
    return this.markers.exists(id)
  }

  private buildDefinition(position: Vector3, options: MarkerOptions): ClientMarkerDefinition {
    return {
      position,
      ...this.normalizeOptions({ ...DEFAULT_OPTIONS, ...options }),
    }
  }

  private normalizeOptions(options: Partial<MarkerOptions>): Partial<ClientMarkerDefinition> {
    const { type, variant, scale, size, bob, bobUpAndDown, ...rest } = options
    return {
      ...rest,
      variant: variant ?? type,
      size: size ?? scale,
      bob: bob ?? bobUpAndDown,
    }
  }
}
