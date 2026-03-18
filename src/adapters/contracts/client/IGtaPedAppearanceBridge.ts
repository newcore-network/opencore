import { HeadBlendData } from '../../../kernel/shared/player-appearance.types'

export abstract class IGtaPedAppearanceBridge {
  abstract setComponentVariation(
    ped: number,
    componentId: number,
    drawable: number,
    texture: number,
    palette: number,
  ): void
  abstract setPropIndex(
    ped: number,
    propId: number,
    drawable: number,
    texture: number,
    attach: boolean,
  ): void
  abstract clearProp(ped: number, propId: number): void
  abstract setDefaultComponentVariation(ped: number): void
  abstract setHeadBlendData(ped: number, data: HeadBlendData): void
  abstract setFaceFeature(ped: number, index: number, scale: number): void
  abstract setHeadOverlay(ped: number, overlayId: number, index: number, opacity: number): void
  abstract setHeadOverlayColor(
    ped: number,
    overlayId: number,
    colorType: number,
    colorId: number,
    secondColorId: number,
  ): void
  abstract setHairColor(ped: number, colorId: number, highlightColorId: number): void
  abstract setEyeColor(ped: number, index: number): void
  abstract addDecoration(ped: number, collectionHash: number, overlayHash: number): void
  abstract clearDecorations(ped: number): void
  abstract getDrawableVariation(ped: number, componentId: number): number
  abstract getTextureVariation(ped: number, componentId: number): number
  abstract getPropIndex(ped: number, propId: number): number
  abstract getPropTextureIndex(ped: number, propId: number): number
  abstract getNumDrawableVariations(ped: number, componentId: number): number
  abstract getNumTextureVariations(ped: number, componentId: number, drawable: number): number
  abstract getNumPropDrawableVariations(ped: number, propId: number): number
  abstract getNumPropTextureVariations(ped: number, propId: number, drawable: number): number
  abstract getNumOverlayValues(overlayId: number): number
  abstract getNumHairColors(): number
  abstract getNumMakeupColors(): number
}
