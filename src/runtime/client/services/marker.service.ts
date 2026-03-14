import { inject, injectable } from 'tsyringe'
import { Vector3 } from '../../../kernel/utils/vector3'
import { IClientRuntimeBridge } from '../adapter/runtime-bridge'
import { IClientMarkerBridge } from '../../../adapters/contracts/client/ui/IClientMarkerBridge'

export interface MarkerOptions {
  type?: number
  scale?: Vector3
  rotation?: Vector3
  color?: { r: number; g: number; b: number; a: number }
  bobUpAndDown?: boolean
  faceCamera?: boolean
  rotate?: boolean
  drawOnEnts?: boolean
}

export interface ManagedMarker {
  id: string
  position: Vector3
  options: Required<MarkerOptions>
  visible: boolean
}

const DEFAULT_OPTIONS: Required<MarkerOptions> = {
  type: 1,
  scale: { x: 1.0, y: 1.0, z: 1.0 },
  rotation: { x: 0, y: 0, z: 0 },
  color: { r: 255, g: 0, b: 0, a: 200 },
  bobUpAndDown: false,
  faceCamera: false,
  rotate: false,
  drawOnEnts: false,
}

@injectable()
export class MarkerService {
  private activeMarkers: Map<string, ManagedMarker> = new Map()
  private tickHandle: unknown = null
  private idCounter = 0

  constructor(
    @inject(IClientMarkerBridge as any) private readonly markers: IClientMarkerBridge,
    @inject(IClientRuntimeBridge as any) private readonly runtime: IClientRuntimeBridge,
  ) {}

  create(position: Vector3, options: MarkerOptions = {}): string {
    const id = `marker_${++this.idCounter}`
    this.activeMarkers.set(id, {
      id,
      position,
      options: { ...DEFAULT_OPTIONS, ...options },
      visible: true,
    })
    this.ensureTickRunning()
    return id
  }

  remove(id: string): boolean {
    const deleted = this.activeMarkers.delete(id)
    this.checkTickNeeded()
    return deleted
  }

  removeAll(): void {
    this.activeMarkers.clear()
    this.stopTick()
  }

  setPosition(id: string, position: Vector3): boolean {
    const marker = this.activeMarkers.get(id)
    if (!marker) return false
    marker.position = position
    return true
  }

  setOptions(id: string, options: Partial<MarkerOptions>): boolean {
    const marker = this.activeMarkers.get(id)
    if (!marker) return false
    marker.options = { ...marker.options, ...options }
    return true
  }

  setVisible(id: string, visible: boolean): boolean {
    const marker = this.activeMarkers.get(id)
    if (!marker) return false
    marker.visible = visible
    return true
  }

  get(id: string): ManagedMarker | undefined {
    return this.activeMarkers.get(id)
  }
  getAll(): ManagedMarker[] {
    return Array.from(this.activeMarkers.values())
  }

  drawOnce(position: Vector3, options: MarkerOptions = {}): void {
    this.drawMarker(position, { ...DEFAULT_OPTIONS, ...options })
  }

  private ensureTickRunning(): void {
    if (this.tickHandle !== null) return
    this.tickHandle = this.runtime.setTick(() => {
      for (const marker of this.activeMarkers.values()) {
        if (!marker.visible) continue
        this.drawMarker(marker.position, marker.options)
      }
    })
  }

  private drawMarker(position: Vector3, options: Required<MarkerOptions>): void {
    this.markers.draw({
      type: options.type,
      position,
      rotation: options.rotation,
      scale: options.scale,
      color: options.color,
      bobUpAndDown: options.bobUpAndDown,
      faceCamera: options.faceCamera,
      rotate: options.rotate,
      drawOnEnts: options.drawOnEnts,
    })
  }

  private stopTick(): void {
    if (this.tickHandle !== null) {
      this.runtime.clearTick(this.tickHandle)
      this.tickHandle = null
    }
  }

  private checkTickNeeded(): void {
    if (this.activeMarkers.size === 0) this.stopTick()
  }
}
