import type { HeadBlendData } from '../../kernel/shared'
import { IPedAppearanceClient } from '../contracts/IPedAppearanceClient'

/**
 * FiveM implementation of client-side ped appearance adapter.
 *
 * @remarks
 * Wraps FiveM natives for ped appearance manipulation.
 * All natives are client-side only.
 */
export class FiveMPedAppearanceClientAdapter extends IPedAppearanceClient {
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

  setHeadBlendData(ped: number, data: HeadBlendData): void {
    SetPedHeadBlendData(
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
    SetPedFaceFeature(ped, index, scale)
  }

  setHeadOverlay(ped: number, overlayId: number, index: number, opacity: number): void {
    SetPedHeadOverlay(ped, overlayId, index, opacity)
  }

  setHeadOverlayColor(
    ped: number,
    overlayId: number,
    colorType: number,
    colorId: number,
    secondColorId: number,
  ): void {
    SetPedHeadOverlayColor(ped, overlayId, colorType, colorId, secondColorId)
  }

  setHairColor(ped: number, colorId: number, highlightColorId: number): void {
    SetPedHairColor(ped, colorId, highlightColorId)
  }

  setEyeColor(ped: number, index: number): void {
    SetPedEyeColor(ped, index)
  }

  addDecoration(ped: number, collectionHash: number, overlayHash: number): void {
    AddPedDecorationFromHashes(ped, collectionHash, overlayHash)
  }

  clearDecorations(ped: number): void {
    ClearPedDecorations(ped)
  }

  getDrawableVariation(ped: number, componentId: number): number {
    return GetPedDrawableVariation(ped, componentId)
  }

  getTextureVariation(ped: number, componentId: number): number {
    return GetPedTextureVariation(ped, componentId)
  }

  getPropIndex(ped: number, propId: number): number {
    return GetPedPropIndex(ped, propId)
  }

  getPropTextureIndex(ped: number, propId: number): number {
    return GetPedPropTextureIndex(ped, propId)
  }

  getNumDrawableVariations(ped: number, componentId: number): number {
    return GetNumberOfPedDrawableVariations(ped, componentId)
  }

  getNumTextureVariations(ped: number, componentId: number, drawable: number): number {
    return GetNumberOfPedTextureVariations(ped, componentId, drawable)
  }

  getNumPropDrawableVariations(ped: number, propId: number): number {
    return GetNumberOfPedPropDrawableVariations(ped, propId)
  }

  getNumPropTextureVariations(ped: number, propId: number, drawable: number): number {
    return GetNumberOfPedPropTextureVariations(ped, propId, drawable)
  }

  getNumOverlayValues(overlayId: number): number {
    return GetNumHeadOverlayValues(overlayId)
  }

  getNumHairColors(): number {
    return GetNumHairColors()
  }

  getNumMakeupColors(): number {
    return GetNumMakeupColors()
  }
}
