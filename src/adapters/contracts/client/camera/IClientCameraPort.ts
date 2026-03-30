import type { Vector3 } from '../../../../kernel/utils/vector3'

/**
 * Euler rotation used by scripted camera implementations.
 */
export interface ClientCameraRotation {
  x: number
  y: number
  z: number
}

/**
 * Complete transform payload for a scripted camera.
 */
export interface ClientCameraTransform {
  position: Vector3
  rotation?: ClientCameraRotation
  fov?: number
}

/**
 * Options for creating a new scripted camera.
 */
export interface ClientCameraCreateOptions {
  camName?: string
  active?: boolean
  transform?: ClientCameraTransform
}

/**
 * Options for enabling or disabling camera rendering.
 */
export interface ClientCameraRenderOptions {
  ease?: boolean
  easeTimeMs?: number
}

/**
 * Shake parameters for a scripted camera.
 */
export interface ClientCameraShakeOptions {
  type: string
  amplitude: number
}

/**
 * Intent-oriented client camera port.
 *
 * The framework asks for high-level camera actions through this port and the
 * active adapter decides how those actions are achieved for the runtime.
 */
export abstract class IClientCameraPort {
  /**
   * Creates a new scripted camera and returns its runtime handle.
   */
  abstract create(options?: ClientCameraCreateOptions): number

  /**
   * Activates or deactivates a specific camera.
   */
  abstract setActive(camera: number, active: boolean): void

  /**
   * Enables or disables scripted camera rendering.
   */
  abstract render(enable: boolean, options?: ClientCameraRenderOptions): void

  /**
   * Destroys a single scripted camera.
   */
  abstract destroy(camera: number, destroyActiveCamera?: boolean): void

  /**
   * Destroys every scripted camera controlled by the adapter/runtime.
   */
  abstract destroyAll(destroyActiveCamera?: boolean): void

  /**
   * Applies a transform to a camera.
   */
  abstract setTransform(camera: number, transform: ClientCameraTransform): void

  /**
   * Updates only the position of a camera.
   */
  abstract setPosition(camera: number, position: Vector3): void

  /**
   * Updates only the rotation of a camera.
   */
  abstract setRotation(camera: number, rotation: ClientCameraRotation, rotationOrder?: number): void

  /**
   * Updates only the field of view of a camera.
   */
  abstract setFov(camera: number, fov: number): void

  /**
   * Makes the camera point at a world position.
   */
  abstract pointAtCoords(camera: number, position: Vector3): void

  /**
   * Makes the camera point at an entity with an optional offset.
   */
  abstract pointAtEntity(camera: number, entity: number, offset?: Vector3): void

  /**
   * Stops any pointing target on the camera.
   */
  abstract stopPointing(camera: number): void

  /**
   * Interpolates from one camera to another.
   */
  abstract interpolate(
    fromCamera: number,
    toCamera: number,
    durationMs: number,
    easeLocation?: boolean,
    easeRotation?: boolean,
  ): void

  /**
   * Starts a camera shake effect.
   */
  abstract shake(camera: number, options: ClientCameraShakeOptions): void

  /**
   * Stops any active shake effect on a camera.
   */
  abstract stopShaking(camera: number, stopImmediately?: boolean): void
}
