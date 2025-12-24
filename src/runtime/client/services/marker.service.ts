import { injectable } from 'tsyringe'
import type { Vector3 } from '../../../kernel/utils'

export interface MarkerOptions {
  /** Marker type (0-43) */
  type?: number
  /** Scale of the marker */
  scale?: Vector3
  /** Rotation of the marker */
  rotation?: Vector3
  /** Color (RGBA) */
  color?: { r: number; g: number; b: number; a: number }
  /** Whether the marker should bob up and down */
  bobUpAndDown?: boolean
  /** Whether the marker should face the camera */
  faceCamera?: boolean
  /** Whether the marker should rotate */
  rotate?: boolean
  /** Draw on entities */
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

/**
 * Service for managing and rendering markers in the game world.
 * Handles automatic rendering via tick.
 */
@injectable()
export class MarkerService {
  private markers: Map<string, ManagedMarker> = new Map()
  private tickHandle: number | null = null
  private idCounter = 0

  /**
   * Create a new managed marker.
   *
   * @param position - World position for the marker
   * @param options - Marker appearance options
   * @returns The marker ID
   */
  create(position: Vector3, options: MarkerOptions = {}): string {
    const id = `marker_${++this.idCounter}`
    const marker: ManagedMarker = {
      id,
      position,
      options: { ...DEFAULT_OPTIONS, ...options },
      visible: true,
    }

    this.markers.set(id, marker)
    this.ensureTickRunning()

    return id
  }

  /**
   * Remove a marker by ID.
   *
   * @param id - The marker ID to remove
   */
  remove(id: string): boolean {
    const deleted = this.markers.delete(id)
    this.checkTickNeeded()
    return deleted
  }

  /**
   * Remove all markers.
   */
  removeAll(): void {
    this.markers.clear()
    this.stopTick()
  }

  /**
   * Update a marker's position.
   *
   * @param id - The marker ID
   * @param position - New position
   */
  setPosition(id: string, position: Vector3): boolean {
    const marker = this.markers.get(id)
    if (!marker) return false
    marker.position = position
    return true
  }

  /**
   * Update marker options.
   *
   * @param id - The marker ID
   * @param options - Options to update
   */
  setOptions(id: string, options: Partial<MarkerOptions>): boolean {
    const marker = this.markers.get(id)
    if (!marker) return false
    marker.options = { ...marker.options, ...options }
    return true
  }

  /**
   * Set marker visibility.
   *
   * @param id - The marker ID
   * @param visible - Whether the marker should be visible
   */
  setVisible(id: string, visible: boolean): boolean {
    const marker = this.markers.get(id)
    if (!marker) return false
    marker.visible = visible
    return true
  }

  /**
   * Get a marker by ID.
   */
  get(id: string): ManagedMarker | undefined {
    return this.markers.get(id)
  }

  /**
   * Get all managed markers.
   */
  getAll(): ManagedMarker[] {
    return Array.from(this.markers.values())
  }

  /**
   * Draw a marker immediately (one frame only).
   * For persistent markers, use create() instead.
   */
  drawOnce(position: Vector3, options: MarkerOptions = {}): void {
    const opts = { ...DEFAULT_OPTIONS, ...options }
    DrawMarker(
      opts.type,
      position.x,
      position.y,
      position.z,
      0,
      0,
      0,
      opts.rotation.x,
      opts.rotation.y,
      opts.rotation.z,
      opts.scale.x,
      opts.scale.y,
      opts.scale.z,
      opts.color.r,
      opts.color.g,
      opts.color.b,
      opts.color.a,
      opts.bobUpAndDown,
      opts.faceCamera,
      2,
      opts.rotate,
      null as unknown as string,
      null as unknown as string,
      opts.drawOnEnts,
    )
  }

  private ensureTickRunning(): void {
    if (this.tickHandle !== null) return

    this.tickHandle = setTick(() => {
      for (const marker of this.markers.values()) {
        if (!marker.visible) continue

        const { position, options } = marker
        DrawMarker(
          options.type,
          position.x,
          position.y,
          position.z,
          0,
          0,
          0,
          options.rotation.x,
          options.rotation.y,
          options.rotation.z,
          options.scale.x,
          options.scale.y,
          options.scale.z,
          options.color.r,
          options.color.g,
          options.color.b,
          options.color.a,
          options.bobUpAndDown,
          options.faceCamera,
          2,
          options.rotate,
          null as unknown as string,
          null as unknown as string,
          options.drawOnEnts,
        )
      }
    })
  }

  private stopTick(): void {
    if (this.tickHandle !== null) {
      clearTick(this.tickHandle)
      this.tickHandle = null
    }
  }

  private checkTickNeeded(): void {
    if (this.markers.size === 0) {
      this.stopTick()
    }
  }
}
