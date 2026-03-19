import { inject, injectable } from 'tsyringe'
import { Vector3 } from '../../../kernel/utils/vector3'
import {
  type ClientCameraCreateOptions as CameraCreateOptions,
  type ClientCameraRenderOptions as CameraRenderOptions,
  type ClientCameraRotation as CameraRotation,
  type ClientCameraShakeOptions as CameraShakeOptions,
  type ClientCameraTransform as CameraTransform,
  IClientCameraPort,
} from '../../../adapters/contracts/client/camera/IClientCameraPort'

export type {
  CameraCreateOptions,
  CameraRenderOptions,
  CameraRotation,
  CameraShakeOptions,
  CameraTransform,
}

@injectable()
export class Camera {
  private activeCam: number | null = null
  private rendering = false

  constructor(@inject(IClientCameraPort as any) private readonly cameras: IClientCameraPort) {}

  create(options: CameraCreateOptions = {}): number {
    const cam = this.cameras.create(options)
    if (options.active) this.activeCam = cam
    return cam
  }

  getActiveCam(): number | null {
    return this.activeCam
  }

  setActive(cam: number, active: boolean): void {
    this.cameras.setActive(cam, active)
    if (active) this.activeCam = cam
    else if (this.activeCam === cam) this.activeCam = null
  }

  render(enable: boolean, options: CameraRenderOptions = {}): void {
    this.cameras.render(enable, options)
    this.rendering = enable
  }

  isRendering(): boolean {
    return this.rendering
  }

  destroy(cam: number, destroyActiveCam = false): void {
    this.cameras.destroy(cam, destroyActiveCam)
    if (this.activeCam === cam) this.activeCam = null
  }

  destroyAll(destroyActiveCam = false): void {
    this.cameras.destroyAll(destroyActiveCam)
    this.activeCam = null
  }

  setPosition(cam: number, position: Vector3): void {
    this.cameras.setPosition(cam, position)
  }

  setRotation(cam: number, rotation: CameraRotation, rotationOrder = 2): void {
    this.cameras.setRotation(cam, rotation, rotationOrder)
  }

  setFov(cam: number, fov: number): void {
    this.cameras.setFov(cam, fov)
  }

  setTransform(cam: number, transform: CameraTransform): void {
    this.cameras.setTransform(cam, transform)
  }

  pointAtCoords(cam: number, position: Vector3): void {
    this.cameras.pointAtCoords(cam, position)
  }

  pointAtEntity(cam: number, entity: number, offset: Vector3 = { x: 0, y: 0, z: 0 }): void {
    this.cameras.pointAtEntity(cam, entity, offset)
  }

  stopPointing(cam: number): void {
    this.cameras.stopPointing(cam)
  }

  interpolate(
    fromCam: number,
    toCam: number,
    durationMs: number,
    easeLocation = true,
    easeRotation = true,
  ): void {
    this.cameras.interpolate(fromCam, toCam, durationMs, easeLocation, easeRotation)
    this.activeCam = toCam
  }

  shake(cam: number, options: CameraShakeOptions): void {
    this.cameras.shake(cam, options)
  }

  stopShaking(cam: number, stopImmediately = true): void {
    this.cameras.stopShaking(cam, stopImmediately)
  }

  reset(options: CameraRenderOptions = {}): void {
    if (this.rendering) this.render(false, options)
    this.destroyAll(false)
  }
}
