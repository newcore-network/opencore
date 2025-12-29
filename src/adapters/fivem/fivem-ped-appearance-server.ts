import { IPedAppearanceServer } from '../contracts/IPedAppearanceServer'

/**
 * FiveM implementation of server-side ped appearance adapter.
 *
 * @remarks
 * Wraps FiveM natives for ped appearance manipulation on server-side.
 * Server-side has limited appearance control - only components and props.
 */
export class FiveMPedAppearanceServerAdapter extends IPedAppearanceServer {
  setComponentVariation(
    ped: number,
    componentId: number,
    drawable: number,
    texture: number,
    palette: number,
  ): void {
    SetPedComponentVariation(ped, componentId, drawable, texture, palette)
  }

  setPropIndex(
    ped: number,
    propId: number,
    drawable: number,
    texture: number,
    attach: boolean,
  ): void {
    SetPedPropIndex(ped, propId, drawable, texture, attach)
  }

  clearProp(ped: number, propId: number): void {
    ClearPedProp(ped, propId)
  }

  setDefaultComponentVariation(ped: number): void {
    SetPedDefaultComponentVariation(ped)
  }
}
