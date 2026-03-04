import { HeadBlendData } from '../../kernel/shared'
import { IPedAppearanceClient } from '../contracts/client/IPedAppearanceClient'

type MaybeNative = ((...args: any[]) => any) | undefined

function getNative(name: string): MaybeNative {
  const value = (globalThis as any)[name]
  return typeof value === 'function' ? value : undefined
}

function callNative(name: string, ...args: any[]): any {
  return getNative(name)?.(...args)
}

/**
 * RedM-safe client appearance adapter.
 *
 * This adapter avoids hard failures when GTA-only natives are unavailable in RedM.
 * Where a native is unsupported, calls are intentionally no-op.
 */
export class RedMPedAppearanceClientAdapter extends IPedAppearanceClient {
  setComponentVariation(
    ped: number,
    componentId: number,
    drawable: number,
    texture: number,
    palette: number,
  ): void {
    callNative('SetPedComponentVariation', ped, componentId, drawable, texture, palette)
  }

  setPropIndex(
    ped: number,
    propId: number,
    drawable: number,
    texture: number,
    attach: boolean,
  ): void {
    callNative('SetPedPropIndex', ped, propId, drawable, texture, attach)
  }

  clearProp(ped: number, propId: number): void {
    callNative('ClearPedProp', ped, propId)
  }

  setDefaultComponentVariation(ped: number): void {
    if (getNative('SetPedDefaultComponentVariation')) {
      callNative('SetPedDefaultComponentVariation', ped)
      return
    }

    if (getNative('SetRandomOutfitVariation')) {
      callNative('SetRandomOutfitVariation', ped, true)
    }
  }

  setHeadBlendData(ped: number, data: HeadBlendData): void {
    callNative(
      'SetPedHeadBlendData',
      ped,
      data.shapeFirst,
      data.shapeSecond,
      data.shapeThird ?? 0,
      data.skinFirst,
      data.skinSecond,
      data.skinThird ?? 0,
      data.shapeMix,
      data.skinMix,
      data.thirdMix ?? 0,
      false,
    )
  }

  setFaceFeature(ped: number, index: number, scale: number): void {
    callNative('SetPedFaceFeature', ped, index, scale)
  }

  setHeadOverlay(ped: number, overlayId: number, index: number, opacity: number): void {
    callNative('SetPedHeadOverlay', ped, overlayId, index, opacity)
  }

  setHeadOverlayColor(
    ped: number,
    overlayId: number,
    colorType: number,
    colorId: number,
    secondColorId: number,
  ): void {
    callNative('SetPedHeadOverlayColor', ped, overlayId, colorType, colorId, secondColorId)
  }

  setHairColor(ped: number, colorId: number, highlightColorId: number): void {
    callNative('SetPedHairColor', ped, colorId, highlightColorId)
  }

  setEyeColor(ped: number, index: number): void {
    callNative('SetPedEyeColor', ped, index)
  }

  addDecoration(ped: number, collectionHash: number, overlayHash: number): void {
    callNative('AddPedDecorationFromHashes', ped, collectionHash, overlayHash)
  }

  clearDecorations(ped: number): void {
    callNative('ClearPedDecorations', ped)
  }

  getDrawableVariation(ped: number, componentId: number): number {
    return callNative('GetPedDrawableVariation', ped, componentId) ?? 0
  }

  getTextureVariation(ped: number, componentId: number): number {
    return callNative('GetPedTextureVariation', ped, componentId) ?? 0
  }

  getPropIndex(ped: number, propId: number): number {
    return callNative('GetPedPropIndex', ped, propId) ?? -1
  }

  getPropTextureIndex(ped: number, propId: number): number {
    return callNative('GetPedPropTextureIndex', ped, propId) ?? 0
  }

  getNumDrawableVariations(ped: number, componentId: number): number {
    return callNative('GetNumberOfPedDrawableVariations', ped, componentId) ?? 0
  }

  getNumTextureVariations(ped: number, componentId: number, drawable: number): number {
    return callNative('GetNumberOfPedTextureVariations', ped, componentId, drawable) ?? 0
  }

  getNumPropDrawableVariations(ped: number, propId: number): number {
    return callNative('GetNumberOfPedPropDrawableVariations', ped, propId) ?? 0
  }

  getNumPropTextureVariations(ped: number, propId: number, drawable: number): number {
    return callNative('GetNumberOfPedPropTextureVariations', ped, propId, drawable) ?? 0
  }

  getNumOverlayValues(overlayId: number): number {
    return callNative('GetNumHeadOverlayValues', overlayId) ?? 0
  }

  getNumHairColors(): number {
    return callNative('GetNumHairColors') ?? 0
  }

  getNumMakeupColors(): number {
    return callNative('GetNumMakeupColors') ?? 0
  }
}
