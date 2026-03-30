import { injectable } from 'tsyringe'
import { Vector3 } from '../../../kernel/utils/vector3'
import { IClientLocalPlayerBridge } from './local-player-bridge'

/**
 * Node fallback local player bridge.
 */
@injectable()
export class NodeClientLocalPlayerBridge extends IClientLocalPlayerBridge {
  getHandle(): number {
    return 0
  }

  getPosition(): Vector3 {
    return { x: 0, y: 0, z: 0 }
  }

  getHeading(): number {
    return 0
  }

  setPosition(_position: Vector3, _heading?: number): void {}
}
