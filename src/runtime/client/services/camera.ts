import { injectable } from 'tsyringe'
import { Vector3 } from '../../../kernel/utils/vector3'

/**
 * Camera rotation represented in degrees.
 */
export interface CameraRotation {
  x: number
  y: number
  z: number
}

/**
 * Full camera transform in world space.
 */
export interface CameraTransform {
  position: Vector3
  rotation?: CameraRotation
  fov?: number
}

/**
 * Configuration used when creating and activating a scripted camera.
 */
export interface CameraCreateOptions {
  /** Native camera name, defaults to DEFAULT_SCRIPTED_CAMERA. */
  camName?: string
  /** Whether the created camera should become active immediately. */
  active?: boolean
  /** Optional initial transform. */
  transform?: CameraTransform
}

/**
 * Render options used when enabling/disabling scripted camera rendering.
 */
export interface CameraRenderOptions {
  /** Smooth transition in or out. */
  ease?: boolean
  /** Transition duration in milliseconds. */
  easeTimeMs?: number
}

/**
 * Shake configuration for scripted camera effects.
 */
export interface CameraShakeOptions {
  /** Native shake type name, e.g. HAND_SHAKE. */
  type: string
  /** Shake amplitude. */
  amplitude: number
}

/**
 * Injectable camera API that wraps FiveM scripted camera natives.
 *
 * @remarks
 * This class intentionally exposes low-level camera primitives so higher-level
 * systems can build cinematic workflows on top of it.
 */
@injectable()
export class Camera {
  private activeCam: number | null = null
  private rendering = false

  /**
   * Creates a scripted camera and optionally initializes its transform.
   */
  create(options: CameraCreateOptions = {}): number {
    const cam = CreateCam(options.camName ?? 'DEFAULT_SCRIPTED_CAMERA', options.active ?? false)

    if (options.transform) {
      this.setTransform(cam, options.transform)
    }

    if (options.active) {
      this.activeCam = cam
    }

    return cam
  }

  /**
   * Returns the currently tracked active camera handle.
   */
  getActiveCam(): number | null {
    return this.activeCam
  }

  /**
   * Sets camera active state and tracks active handle.
   */
  setActive(cam: number, active: boolean): void {
    SetCamActive(cam, active)
    if (active) {
      this.activeCam = cam
    } else if (this.activeCam === cam) {
      this.activeCam = null
    }
  }

  /**
   * Enables or disables scripted camera rendering.
   */
  render(enable: boolean, options: CameraRenderOptions = {}): void {
    RenderScriptCams(enable, options.ease ?? false, options.easeTimeMs ?? 0, true, true)
    this.rendering = enable
  }

  /**
   * Returns whether scripted camera rendering is currently enabled.
   */
  isRendering(): boolean {
    return this.rendering
  }

  /**
   * Destroys a single camera.
   */
  destroy(cam: number, destroyActiveCam = false): void {
    DestroyCam(cam, destroyActiveCam)
    if (this.activeCam === cam) {
      this.activeCam = null
    }
  }

  /**
   * Destroys all scripted cameras managed by the game runtime.
   */
  destroyAll(destroyActiveCam = false): void {
    DestroyAllCams(destroyActiveCam)
    this.activeCam = null
  }

  /**
   * Sets camera world position.
   */
  setPosition(cam: number, position: Vector3): void {
    SetCamCoord(cam, position.x, position.y, position.z)
  }

  /**
   * Sets camera world rotation.
   */
  setRotation(cam: number, rotation: CameraRotation, rotationOrder = 2): void {
    SetCamRot(cam, rotation.x, rotation.y, rotation.z, rotationOrder)
  }

  /**
   * Sets camera field of view.
   */
  setFov(cam: number, fov: number): void {
    SetCamFov(cam, fov)
  }

  /**
   * Applies a full transform to a camera in a single call path.
   */
  setTransform(cam: number, transform: CameraTransform): void {
    this.setPosition(cam, transform.position)

    if (transform.rotation) {
      this.setRotation(cam, transform.rotation)
    }

    if (typeof transform.fov === 'number') {
      this.setFov(cam, transform.fov)
    }
  }

  /**
   * Points a camera at world coordinates.
   */
  pointAtCoords(cam: number, position: Vector3): void {
    PointCamAtCoord(cam, position.x, position.y, position.z)
  }

  /**
   * Points a camera at an entity with an optional offset.
   */
  pointAtEntity(cam: number, entity: number, offset: Vector3 = { x: 0, y: 0, z: 0 }): void {
    PointCamAtEntity(cam, entity, offset.x, offset.y, offset.z, true)
  }

  /**
   * Removes point-at target from the camera.
   */
  stopPointing(cam: number): void {
    StopCamPointing(cam)
  }

  /**
   * Interpolates from one camera to another using native interpolation.
   */
  interpolate(
    fromCam: number,
    toCam: number,
    durationMs: number,
    easeLocation = true,
    easeRotation = true,
  ): void {
    SetCamActiveWithInterp(toCam, fromCam, durationMs, easeLocation ? 1 : 0, easeRotation ? 1 : 0)
    this.activeCam = toCam
  }

  /**
   * Starts a camera shake effect.
   */
  shake(cam: number, options: CameraShakeOptions): void {
    ShakeCam(cam, options.type, options.amplitude)
  }

  /**
   * Stops camera shake for a camera.
   */
  stopShaking(cam: number, stopImmediately = true): void {
    StopCamShaking(cam, stopImmediately)
  }

  /**
   * Fully resets camera rendering and internal camera tracking.
   */
  reset(options: CameraRenderOptions = {}): void {
    if (this.rendering) {
      this.render(false, options)
    }
    this.destroyAll(false)
  }
}
