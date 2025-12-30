import { HeadBlendData } from '../../kernel/shared'

/**
 * Client-side ped appearance operations adapter.
 *
 * @remarks
 * Abstracts FiveM ped appearance natives for client-side operations.
 * Allows the runtime to work without direct FiveM dependencies.
 *
 * Most appearance natives are client-only (headBlend, faceFeatures, overlays, tattoos).
 * This adapter provides a unified interface for all appearance operations.
 */
export abstract class IPedAppearanceClient {
  /**
   * Sets a ped's component variation (clothing, hair, etc.).
   *
   * @param ped - Ped entity handle
   * @param componentId - Component ID (0-11)
   * @param drawable - Drawable index
   * @param texture - Texture index
   * @param palette - Palette ID (usually 2)
   */
  abstract setComponentVariation(
    ped: number,
    componentId: number,
    drawable: number,
    texture: number,
    palette: number,
  ): void

  /**
   * Sets a ped's prop (hat, glasses, etc.).
   *
   * @param ped - Ped entity handle
   * @param propId - Prop ID (0-7)
   * @param drawable - Drawable index
   * @param texture - Texture index
   * @param attach - Whether to attach the prop
   */
  abstract setPropIndex(
    ped: number,
    propId: number,
    drawable: number,
    texture: number,
    attach: boolean,
  ): void

  /**
   * Clears a ped's prop.
   *
   * @param ped - Ped entity handle
   * @param propId - Prop ID to clear (0-7)
   */
  abstract clearProp(ped: number, propId: number): void

  /**
   * Sets the ped to default component variation.
   *
   * @param ped - Ped entity handle
   */
  abstract setDefaultComponentVariation(ped: number): void

  /**
   * Sets the ped's head blend data for facial structure.
   *
   * @remarks
   * This must be called before setting face features, overlays, or overlay colors.
   *
   * @param ped - Ped entity handle
   * @param data - Head blend configuration
   */
  abstract setHeadBlendData(ped: number, data: HeadBlendData): void

  /**
   * Sets a face feature morph value.
   *
   * @remarks
   * SetPedHeadBlendData must be called before this.
   *
   * @param ped - Ped entity handle
   * @param index - Feature index (0-19)
   * @param scale - Scale value (-1.0 to 1.0)
   */
  abstract setFaceFeature(ped: number, index: number, scale: number): void

  /**
   * Sets a head overlay (makeup, facial hair, etc.).
   *
   * @remarks
   * SetPedHeadBlendData must be called before this.
   *
   * @param ped - Ped entity handle
   * @param overlayId - Overlay ID (0-12)
   * @param index - Overlay variation index (255 to disable)
   * @param opacity - Opacity (0.0-1.0)
   */
  abstract setHeadOverlay(ped: number, overlayId: number, index: number, opacity: number): void

  /**
   * Sets the color for a head overlay.
   *
   * @remarks
   * Must be called after SetPedHeadOverlay.
   *
   * @param ped - Ped entity handle
   * @param overlayId - Overlay ID (0-12)
   * @param colorType - Color type (0: default, 1: hair, 2: makeup)
   * @param colorId - Primary color ID
   * @param secondColorId - Secondary color ID
   */
  abstract setHeadOverlayColor(
    ped: number,
    overlayId: number,
    colorType: number,
    colorId: number,
    secondColorId: number,
  ): void

  /**
   * Sets the ped's hair color.
   *
   * @param ped - Ped entity handle
   * @param colorId - Primary hair color ID
   * @param highlightColorId - Highlight color ID
   */
  abstract setHairColor(ped: number, colorId: number, highlightColorId: number): void

  /**
   * Sets the ped's eye color.
   *
   * @param ped - Ped entity handle
   * @param index - Eye color index (0-31)
   */
  abstract setEyeColor(ped: number, index: number): void

  /**
   * Adds a decoration (tattoo) to the ped.
   *
   * @param ped - Ped entity handle
   * @param collectionHash - Collection name hash
   * @param overlayHash - Overlay name hash
   */
  abstract addDecoration(ped: number, collectionHash: number, overlayHash: number): void

  /**
   * Clears all decorations (tattoos) from the ped.
   *
   * @param ped - Ped entity handle
   */
  abstract clearDecorations(ped: number): void

  /**
   * Gets the drawable variation for a component.
   *
   * @param ped - Ped entity handle
   * @param componentId - Component ID (0-11)
   * @returns Drawable index
   */
  abstract getDrawableVariation(ped: number, componentId: number): number

  /**
   * Gets the texture variation for a component.
   *
   * @param ped - Ped entity handle
   * @param componentId - Component ID (0-11)
   * @returns Texture index
   */
  abstract getTextureVariation(ped: number, componentId: number): number

  /**
   * Gets the prop index for a prop slot.
   *
   * @param ped - Ped entity handle
   * @param propId - Prop ID (0-7)
   * @returns Prop drawable index (-1 if none)
   */
  abstract getPropIndex(ped: number, propId: number): number

  /**
   * Gets the prop texture index.
   *
   * @param ped - Ped entity handle
   * @param propId - Prop ID (0-7)
   * @returns Prop texture index
   */
  abstract getPropTextureIndex(ped: number, propId: number): number

  /**
   * Gets the number of drawable variations for a component.
   *
   * @param ped - Ped entity handle
   * @param componentId - Component ID (0-11)
   * @returns Number of available drawables
   */
  abstract getNumDrawableVariations(ped: number, componentId: number): number

  /**
   * Gets the number of texture variations for a component drawable.
   *
   * @param ped - Ped entity handle
   * @param componentId - Component ID (0-11)
   * @param drawable - Drawable index
   * @returns Number of available textures
   */
  abstract getNumTextureVariations(ped: number, componentId: number, drawable: number): number

  /**
   * Gets the number of drawable variations for a prop.
   *
   * @param ped - Ped entity handle
   * @param propId - Prop ID (0-7)
   * @returns Number of available prop drawables
   */
  abstract getNumPropDrawableVariations(ped: number, propId: number): number

  /**
   * Gets the number of texture variations for a prop drawable.
   *
   * @param ped - Ped entity handle
   * @param propId - Prop ID (0-7)
   * @param drawable - Drawable index
   * @returns Number of available textures
   */
  abstract getNumPropTextureVariations(ped: number, propId: number, drawable: number): number

  /**
   * Gets the number of overlay values for an overlay type.
   *
   * @param overlayId - Overlay ID (0-12)
   * @returns Number of available overlay variations
   */
  abstract getNumOverlayValues(overlayId: number): number

  /**
   * Gets the number of hair colors available.
   *
   * @returns Number of hair colors
   */
  abstract getNumHairColors(): number

  /**
   * Gets the number of makeup colors available.
   *
   * @returns Number of makeup colors
   */
  abstract getNumMakeupColors(): number
}
