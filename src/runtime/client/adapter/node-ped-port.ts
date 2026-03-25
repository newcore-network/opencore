import { injectable } from 'tsyringe'
import {
  type ClientPedAnimationOptions,
  type ClientPedSpawnOptions,
  IClientPedPort,
} from '../../../adapters/contracts/client/ped/IClientPedPort'
import type { Vector3 } from '../../../kernel/utils/vector3'

@injectable()
export class NodeClientPedPort extends IClientPedPort {
  async spawn(_options: ClientPedSpawnOptions): Promise<number> {
    return 0
  }
  delete(_handle: number): void {}
  exists(_handle: number): boolean {
    return false
  }
  async playAnimation(_handle: number, _options: ClientPedAnimationOptions): Promise<void> {}
  stopAnimation(_handle: number): void {}
  stopAnimationImmediately(_handle: number): void {}
  freeze(_handle: number, _freeze: boolean): void {}
  setInvincible(_handle: number, _invincible: boolean): void {}
  giveWeapon(
    _handle: number,
    _weapon: string,
    _ammo = 100,
    _hidden = false,
    _forceInHand = true,
  ): void {}
  removeAllWeapons(_handle: number): void {}
  getClosest(_radius = 10, _excludeLocalPlayer = true): number | null {
    return null
  }
  getNearby(_position: Vector3, _radius: number, _excludeEntity?: number): number[] {
    return []
  }
  lookAtEntity(_handle: number, _entity: number, _duration = -1): void {}
  lookAtCoords(_handle: number, _position: Vector3, _duration = -1): void {}
  walkTo(_handle: number, _position: Vector3, _speed = 1): void {}
  setCombatAttributes(_handle: number, _canFight: boolean, _canUseCover = true): void {}
}
