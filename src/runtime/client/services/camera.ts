import { inject, injectable } from 'tsyringe'
import { Vector3 } from '../../../kernel/utils/vector3'
import { IClientPlatformBridge } from '../adapter/platform-bridge'

export interface CameraRotation {
  x: number
  y: number
  z: number
}

export interface CameraTransform {
  position: Vector3
  rotation?: CameraRotation
  fov?: number
}

export interface CameraCreateOptions {
  camName?: string
  active?: boolean
  transform?: CameraTransform
}

export interface CameraRenderOptions {
  ease?: boolean
  easeTimeMs?: number
}

export interface CameraShakeOptions {
  type: string
  amplitude: number
}

@injectable()
export class Camera {
  private activeCam: number | null = null
  private rendering = false

  constructor(
    @inject(IClientPlatformBridge as any) private readonly platform: IClientPlatformBridge,
  ) {}

  create(options: CameraCreateOptions = {}): number {
    const cam = this.platform.createCam(
      options.camName ?? 'DEFAULT_SCRIPTED_CAMERA',
      options.active ?? false,
    )

    if (options.transform) this.setTransform(cam, options.transform)
    if (options.active) this.activeCam = cam
    return cam
  }

  getActiveCam(): number | null {
    return this.activeCam
  }

  setActive(cam: number, active: boolean): void {
    this.platform.setCamActive(cam, active)
    if (active) this.activeCam = cam
    else if (this.activeCam === cam) this.activeCam = null
  }

  render(enable: boolean, options: CameraRenderOptions = {}): void {
    this.platform.renderScriptCams(
      enable,
      options.ease ?? false,
      options.easeTimeMs ?? 0,
      true,
      true,
    )
    this.rendering = enable
  }

  isRendering(): boolean {
    return this.rendering
  }

  destroy(cam: number, destroyActiveCam = false): void {
    this.platform.destroyCam(cam, destroyActiveCam)
    if (this.activeCam === cam) this.activeCam = null
  }

  destroyAll(destroyActiveCam = false): void {
    this.platform.destroyAllCams(destroyActiveCam)
    this.activeCam = null
  }

  setPosition(cam: number, position: Vector3): void {
    this.platform.setCamCoord(cam, position)
  }

  setRotation(cam: number, rotation: CameraRotation, rotationOrder = 2): void {
    this.platform.setCamRot(cam, rotation, rotationOrder)
  }

  setFov(cam: number, fov: number): void {
    this.platform.setCamFov(cam, fov)
  }

  setTransform(cam: number, transform: CameraTransform): void {
    this.setPosition(cam, transform.position)
    if (transform.rotation) this.setRotation(cam, transform.rotation)
    if (typeof transform.fov === 'number') this.setFov(cam, transform.fov)
  }

  pointAtCoords(cam: number, position: Vector3): void {
    this.platform.pointCamAtCoord(cam, position)
  }

  pointAtEntity(cam: number, entity: number, offset: Vector3 = { x: 0, y: 0, z: 0 }): void {
    this.platform.pointCamAtEntity(cam, entity, offset)
  }

  stopPointing(cam: number): void {
    this.platform.stopCamPointing(cam)
  }

  interpolate(
    fromCam: number,
    toCam: number,
    durationMs: number,
    easeLocation = true,
    easeRotation = true,
  ): void {
    this.platform.setCamActiveWithInterp(
      toCam,
      fromCam,
      durationMs,
      easeLocation ? 1 : 0,
      easeRotation ? 1 : 0,
    )
    this.activeCam = toCam
  }

  shake(cam: number, options: CameraShakeOptions): void {
    this.platform.shakeCam(cam, options.type, options.amplitude)
  }

  stopShaking(cam: number, stopImmediately = true): void {
    this.platform.stopCamShaking(cam, stopImmediately)
  }

  reset(options: CameraRenderOptions = {}): void {
    if (this.rendering) this.render(false, options)
    this.destroyAll(false)
  }
}
