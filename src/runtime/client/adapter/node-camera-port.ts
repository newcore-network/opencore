import { injectable } from 'tsyringe'
import {
  type ClientCameraCreateOptions,
  type ClientCameraRotation,
  type ClientCameraRenderOptions,
  type ClientCameraShakeOptions,
  type ClientCameraTransform,
  IClientCameraPort,
} from '../../../adapters/contracts/client/camera/IClientCameraPort'
import type { Vector3 } from '../../../kernel/utils/vector3'

@injectable()
export class NodeClientCameraPort extends IClientCameraPort {
  create(_options?: ClientCameraCreateOptions): number {
    return 0
  }

  setActive(_camera: number, _active: boolean): void {}

  render(_enable: boolean, _options?: ClientCameraRenderOptions): void {}

  destroy(_camera: number, _destroyActiveCamera?: boolean): void {}

  destroyAll(_destroyActiveCamera?: boolean): void {}

  setTransform(_camera: number, _transform: ClientCameraTransform): void {}

  setPosition(_camera: number, _position: Vector3): void {}

  setRotation(_camera: number, _rotation: ClientCameraRotation, _rotationOrder?: number): void {}

  setFov(_camera: number, _fov: number): void {}

  pointAtCoords(_camera: number, _position: Vector3): void {}

  pointAtEntity(_camera: number, _entity: number, _offset?: Vector3): void {}

  stopPointing(_camera: number): void {}

  interpolate(
    _fromCamera: number,
    _toCamera: number,
    _durationMs: number,
    _easeLocation?: boolean,
    _easeRotation?: boolean,
  ): void {}

  shake(_camera: number, _options: ClientCameraShakeOptions): void {}

  stopShaking(_camera: number, _stopImmediately?: boolean): void {}
}
