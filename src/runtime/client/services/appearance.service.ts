import { inject, injectable } from 'tsyringe'
import { IHasher } from '../../../adapters/contracts/IHasher'
import { IPedAppearanceClient } from '../../../adapters/contracts/client/IPedAppearanceClient'
import { AppearanceValidationResult, PlayerAppearance } from '../../../kernel/shared'

/**
 * Client-side appearance management service.
 *
 * @remarks
 * Handles applying and retrieving ped appearance data on the client.
 * Uses adapters for FiveM native abstraction, enabling testability.
 *
 * This service is typically called in response to server events
 * after the server has validated the appearance data.
 *
 * @example
 * ```typescript
 * // Apply appearance from server-validated data
 * await appearanceService.applyAppearance(PlayerPedId(), validatedAppearance)
 *
 * // Get current appearance for saving
 * const currentAppearance = await appearanceService.getAppearance(PlayerPedId())
 * ```
 */
@injectable()
export class AppearanceService {
  constructor(
    @inject(IPedAppearanceClient as any) private pedAdapter: IPedAppearanceClient,
    @inject(IHasher as any) private hasher: IHasher,
  ) {}

  /**
   * Applies a complete appearance to a ped.
   *
   * @remarks
   * The order of application is important:
   * 1. HeadBlend (required before overlays/features)
   * 2. Face features
   * 3. Components
   * 4. Props
   * 5. Head overlays with colors
   * 6. Hair color
   * 7. Eye color
   * 8. Tattoos
   *
   * @param ped - Ped entity handle
   * @param appearance - Appearance data to apply
   */
  async applyAppearance(ped: number, appearance: PlayerAppearance): Promise<void> {
    // 1. HeadBlend must be set first (required for overlays and face features)
    if (appearance.headBlend) {
      this.pedAdapter.setHeadBlendData(ped, appearance.headBlend)
    }

    // 2. Face features (requires headBlend)
    if (appearance.faceFeatures) {
      for (const [index, value] of Object.entries(appearance.faceFeatures)) {
        this.pedAdapter.setFaceFeature(ped, parseInt(index, 10), value)
      }
    }

    // 3. Components (clothing, hair, etc.)
    if (appearance.components) {
      for (const [componentId, data] of Object.entries(appearance.components)) {
        this.pedAdapter.setComponentVariation(
          ped,
          parseInt(componentId, 10),
          data.drawable,
          data.texture,
          2,
        )
      }
    }

    // 4. Props (hats, glasses, etc.)
    if (appearance.props) {
      for (const [propId, data] of Object.entries(appearance.props)) {
        if (data.drawable === -1) {
          this.pedAdapter.clearProp(ped, parseInt(propId, 10))
        } else {
          this.pedAdapter.setPropIndex(ped, parseInt(propId, 10), data.drawable, data.texture, true)
        }
      }
    }

    // 5. Head overlays with colors (requires headBlend)
    if (appearance.headOverlays) {
      for (const [overlayId, overlay] of Object.entries(appearance.headOverlays)) {
        const id = parseInt(overlayId, 10)
        this.pedAdapter.setHeadOverlay(ped, id, overlay.index, overlay.opacity)

        if (overlay.colorType !== undefined && overlay.colorId !== undefined) {
          this.pedAdapter.setHeadOverlayColor(
            ped,
            id,
            overlay.colorType,
            overlay.colorId,
            overlay.secondColorId ?? overlay.colorId,
          )
        }
      }
    }

    // 6. Hair color
    if (appearance.hairColor) {
      this.pedAdapter.setHairColor(
        ped,
        appearance.hairColor.colorId,
        appearance.hairColor.highlightColorId,
      )
    }

    // 7. Eye color
    if (appearance.eyeColor !== undefined) {
      this.pedAdapter.setEyeColor(ped, appearance.eyeColor)
    }

    // 8. Tattoos
    if (appearance.tattoos && appearance.tattoos.length > 0) {
      this.pedAdapter.clearDecorations(ped)
      for (const tattoo of appearance.tattoos) {
        const collectionHash = this.hasher.getHashKey(tattoo.collection)
        const overlayHash = this.hasher.getHashKey(tattoo.overlay)
        this.pedAdapter.addDecoration(ped, collectionHash, overlayHash)
      }
    }
  }

  /**
   * Retrieves the current appearance of a ped.
   *
   * @remarks
   * Only retrieves components and props as other data (headBlend, overlays, etc.)
   * cannot be read back from the game.
   *
   * @param ped - Ped entity handle
   * @returns Partial appearance data (components and props only)
   */
  async getAppearance(ped: number): Promise<PlayerAppearance> {
    const appearance: PlayerAppearance = {
      components: {},
      props: {},
    }

    if (!appearance.components) appearance.components = {}
    if (!appearance.props) appearance.props = {}

    // Components (0-11)
    for (let i = 0; i <= 11; i++) {
      const drawable = this.pedAdapter.getDrawableVariation(ped, i)
      const texture = this.pedAdapter.getTextureVariation(ped, i)

      if (drawable !== -1) {
        appearance.components[i] = { drawable, texture }
      }
    }

    // Props (0-7)
    for (let i = 0; i <= 7; i++) {
      const drawable = this.pedAdapter.getPropIndex(ped, i)
      const texture = this.pedAdapter.getPropTextureIndex(ped, i)

      if (drawable !== -1) {
        appearance.props[i] = { drawable, texture }
      }
    }

    return appearance
  }

  /**
   * Gets the number of available drawable variations for a component.
   *
   * @param ped - Ped entity handle
   * @param componentId - Component ID (0-11)
   * @returns Number of available drawables
   */
  getNumComponentDrawables(ped: number, componentId: number): number {
    return this.pedAdapter.getNumDrawableVariations(ped, componentId)
  }

  /**
   * Gets the number of available texture variations for a component drawable.
   *
   * @param ped - Ped entity handle
   * @param componentId - Component ID (0-11)
   * @param drawable - Drawable index
   * @returns Number of available textures
   */
  getNumComponentTextures(ped: number, componentId: number, drawable: number): number {
    return this.pedAdapter.getNumTextureVariations(ped, componentId, drawable)
  }

  /**
   * Gets the number of available drawable variations for a prop.
   *
   * @param ped - Ped entity handle
   * @param propId - Prop ID (0-7)
   * @returns Number of available drawables
   */
  getNumPropDrawables(ped: number, propId: number): number {
    return this.pedAdapter.getNumPropDrawableVariations(ped, propId)
  }

  /**
   * Gets the number of available texture variations for a prop drawable.
   *
   * @param ped - Ped entity handle
   * @param propId - Prop ID (0-7)
   * @param drawable - Drawable index
   * @returns Number of available textures
   */
  getNumPropTextures(ped: number, propId: number, drawable: number): number {
    return this.pedAdapter.getNumPropTextureVariations(ped, propId, drawable)
  }

  /**
   * Gets the number of available overlay variations.
   *
   * @param overlayId - Overlay ID (0-12)
   * @returns Number of available variations
   */
  getNumOverlayValues(overlayId: number): number {
    return this.pedAdapter.getNumOverlayValues(overlayId)
  }

  /**
   * Gets the number of available hair colors.
   *
   * @returns Number of hair colors
   */
  getNumHairColors(): number {
    return this.pedAdapter.getNumHairColors()
  }

  /**
   * Gets the number of available makeup colors.
   *
   * @returns Number of makeup colors
   */
  getNumMakeupColors(): number {
    return this.pedAdapter.getNumMakeupColors()
  }

  /**
   * Validates appearance data structure.
   *
   * @remarks
   * This is a client-side validation for data integrity.
   * Server-side validation should always be performed for security.
   *
   * @param appearance - Appearance data to validate
   * @returns Validation result with errors if any
   */
  validateAppearance(appearance: Partial<PlayerAppearance>): AppearanceValidationResult {
    const errors: string[] = []

    if (!appearance) {
      return { valid: false, errors: ['Appearance data is null or undefined'] }
    }

    // Validate components (0-11)
    if (appearance.components) {
      for (const [id, data] of Object.entries(appearance.components)) {
        const componentId = parseInt(id, 10)
        if (Number.isNaN(componentId) || componentId < 0 || componentId > 11) {
          errors.push(`Invalid component ID: ${id}`)
        }
        if (data.drawable === undefined || data.texture === undefined) {
          errors.push(`Missing drawable or texture for component ${id}`)
        }
      }
    }

    // Validate props (0-7)
    if (appearance.props) {
      for (const [id, data] of Object.entries(appearance.props)) {
        const propId = parseInt(id, 10)
        if (Number.isNaN(propId) || propId < 0 || propId > 7) {
          errors.push(`Invalid prop ID: ${id}`)
        }
        if (data.drawable === undefined || data.texture === undefined) {
          errors.push(`Missing drawable or texture for prop ${id}`)
        }
      }
    }

    // Validate faceFeatures (0-19, values -1.0 to 1.0)
    if (appearance.faceFeatures) {
      for (const [id, value] of Object.entries(appearance.faceFeatures)) {
        const index = parseInt(id, 10)
        if (Number.isNaN(index) || index < 0 || index > 19) {
          errors.push(`Invalid face feature index: ${id}`)
        }
        if (value < -1.0 || value > 1.0) {
          errors.push(`Face feature ${id} value out of range: ${value}`)
        }
      }
    }

    // Validate headBlend
    if (appearance.headBlend) {
      const hb = appearance.headBlend
      if (hb.shapeFirst < 0 || hb.shapeFirst > 45) errors.push('Invalid shapeFirst (0-45)')
      if (hb.shapeSecond < 0 || hb.shapeSecond > 45) errors.push('Invalid shapeSecond (0-45)')
      if (hb.skinFirst < 0 || hb.skinFirst > 45) errors.push('Invalid skinFirst (0-45)')
      if (hb.skinSecond < 0 || hb.skinSecond > 45) errors.push('Invalid skinSecond (0-45)')
      if (hb.shapeMix < 0 || hb.shapeMix > 1) errors.push('Invalid shapeMix (0.0-1.0)')
      if (hb.skinMix < 0 || hb.skinMix > 1) errors.push('Invalid skinMix (0.0-1.0)')
    }

    // Validate headOverlays (0-12)
    if (appearance.headOverlays) {
      for (const [id, overlay] of Object.entries(appearance.headOverlays)) {
        const overlayId = parseInt(id, 10)
        if (Number.isNaN(overlayId) || overlayId < 0 || overlayId > 12) {
          errors.push(`Invalid overlay ID: ${id}`)
        }
        if (overlay.opacity < 0 || overlay.opacity > 1) {
          errors.push(`Invalid overlay opacity for ID ${id}`)
        }
      }
    }

    // Validate eyeColor (0-31)
    if (appearance.eyeColor !== undefined) {
      if (appearance.eyeColor < 0 || appearance.eyeColor > 31) {
        errors.push(`Invalid eye color: ${appearance.eyeColor} (0-31)`)
      }
    }

    return { valid: errors.length === 0, errors }
  }

  /**
   * Sets the ped to default component variation.
   *
   * @param ped - Ped entity handle
   */
  setDefaultAppearance(ped: number): void {
    this.pedAdapter.setDefaultComponentVariation(ped)
  }

  /**
   * Clears all tattoos from a ped.
   *
   * @param ped - Ped entity handle
   */
  clearTattoos(ped: number): void {
    this.pedAdapter.clearDecorations(ped)
  }
}
