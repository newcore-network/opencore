import { inject, injectable } from 'tsyringe'
import {
  IClientBlipBridge,
  type ClientBlipOptions,
} from '../../../adapters/contracts/client/ui/IClientBlipBridge'
import type { Vector3 } from '../../../kernel/utils/vector3'
import { IClientPlatformBridge } from './platform-bridge'

@injectable()
export class PlatformBlipBridge extends IClientBlipBridge {
  constructor(
    @inject(IClientPlatformBridge as any) private readonly platform: IClientPlatformBridge,
  ) {
    super()
  }

  create(position: Vector3): number {
    return this.platform.addBlipForCoord(position)
  }
  createForEntity(entity: number): number {
    return this.platform.addBlipForEntity(entity)
  }
  createForRadius(position: Vector3, radius: number): number {
    return this.platform.addBlipForRadius(position, radius)
  }
  exists(handle: number): boolean {
    return this.platform.doesBlipExist(handle)
  }
  remove(handle: number): void {
    this.platform.removeBlip(handle)
  }
  setPosition(handle: number, position: Vector3): void {
    this.platform.setBlipCoords(handle, position)
  }
  applyOptions(handle: number, options: ClientBlipOptions): void {
    if (options.sprite !== undefined) this.platform.setBlipSprite(handle, options.sprite)
    if (options.color !== undefined) this.platform.setBlipColour(handle, options.color)
    if (options.scale !== undefined) this.platform.setBlipScale(handle, options.scale)
    if (options.shortRange !== undefined)
      this.platform.setBlipAsShortRange(handle, options.shortRange)
    if (options.label) this.platform.setBlipName(handle, options.label)
    if (options.display !== undefined) this.platform.setBlipDisplay(handle, options.display)
    if (options.category !== undefined) this.platform.setBlipCategory(handle, options.category)
    if (options.flash !== undefined) this.platform.setBlipFlashes(handle, options.flash)
    if (options.alpha !== undefined) this.platform.setBlipAlpha(handle, options.alpha)
    if (options.route !== undefined) this.platform.setBlipRoute(handle, options.route)
    if (options.routeColor !== undefined)
      this.platform.setBlipRouteColour(handle, options.routeColor)
  }
}
