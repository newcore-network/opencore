import { injectable } from 'tsyringe'
import { Vector3 } from '../../../kernel/utils/vector3'
import { IClientLocalPlayerBridge } from './local-player-bridge'

/**
 * Node fallback local player bridge.
 */
@injectable()
export class NodeClientLocalPlayerBridge extends IClientLocalPlayerBridge {
  setPosition(_position: Vector3, _heading?: number): void {}
}
