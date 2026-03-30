import { injectable } from 'tsyringe'
import {
  type ClientVehicleMods,
  type ClientVehicleSpawnOptions,
  IClientVehiclePort,
} from '../../../adapters/contracts/client/vehicle/IClientVehiclePort'
import type { Vector3 } from '../../../kernel/utils/vector3'

@injectable()
export class NodeClientVehiclePort extends IClientVehiclePort {
  async spawn(_options: ClientVehicleSpawnOptions): Promise<number> {
    return 0
  }
  delete(_vehicle: number): void {}
  repair(_vehicle: number): void {}
  setFuel(_vehicle: number, _level: number): void {}
  getFuel(_vehicle: number): number {
    return 0
  }
  getClosest(_radius = 10): number | null {
    return null
  }
  isLocalPlayerInVehicle(): boolean {
    return false
  }
  getCurrentForLocalPlayer(): number | null {
    return null
  }
  getLastForLocalPlayer(): number | null {
    return null
  }
  isLocalPlayerDriver(_vehicle: number): boolean {
    return false
  }
  warpLocalPlayerInto(_vehicle: number, _seatIndex = -1): void {}
  leaveLocalPlayerVehicle(_vehicle: number, _flags = 16): void {}
  applyMods(_vehicle: number, _mods: ClientVehicleMods): void {}
  setDoorsLocked(_vehicle: number, _locked: boolean): void {}
  setEngineRunning(_vehicle: number, _running: boolean, _instant = false): void {}
  setInvincible(_vehicle: number, _invincible: boolean): void {}
  getSpeed(_vehicle: number): number {
    return 0
  }
  setHeading(_vehicle: number, _heading: number): void {}
  teleport(_vehicle: number, _position: Vector3, _heading?: number): void {}
  exists(_vehicle: number): boolean {
    return false
  }
  getNetworkId(_vehicle: number): number {
    return 0
  }
  getFromNetworkId(_networkId: number): number {
    return 0
  }
  getState<T = unknown>(_vehicle: number, _key: string): T | undefined {
    return undefined
  }
  getPosition(_vehicle: number): Vector3 | null {
    return null
  }
  getHeading(_vehicle: number): number {
    return 0
  }
  getModel(_vehicle: number): number {
    return 0
  }
  getPlate(_vehicle: number): string {
    return ''
  }
}
