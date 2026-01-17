import { inject, injectable } from 'tsyringe'
import { INetTransport } from '../../../adapters/contracts/INetTransport'
import { IPedAppearanceServer } from '../../../adapters/contracts/server/IPedAppearanceServer'
import { IPlayerServer } from '../../../adapters/contracts/server/IPlayerServer'
import { AppearanceValidationResult, PlayerAppearance } from '../../../kernel/shared'

/**
 * Server-side appearance management service.
 *
 * @remarks
 * Handles validating and applying ped appearance data on the server.
 * Provides security validation and server-authoritative appearance control.
 *
 * **Security Model:**
 * - All appearance changes should be validated server-side
 * - Server applies components/props directly (available natives)
 * - Server emits events to client for client-only natives (headBlend, overlays, tattoos)
 * - Client never sends appearance data directly to other clients
 *
 * **Persistence:**
 * The framework does NOT handle persistence internally.
 * After calling `applyAppearance`, you receive the validated data back.
 * You decide when and where to save it (persistent storage, file, etc.).
 *
 * @example
 * ```typescript
 * // Apply appearance to a player
 * const result = await appearanceService.applyAppearance(playerSrc, appearanceData)
 * if (result.success) {
 *   // Save to your storage
 *   await myStorage.saveAppearance(playerId, result.appearance)
 * }
 *
 * // Validate appearance without applying
 * const validation = appearanceService.validateAppearance(appearanceData)
 * if (!validation.valid) {
 *   console.log('Errors:', validation.errors)
 * }
 * ```
 */
@injectable()
export class AppearanceService {
  constructor(
    @inject(IPedAppearanceServer as any) private readonly pedAdapter: IPedAppearanceServer,
    @inject(IPlayerServer as any) private readonly playerServer: IPlayerServer,
    @inject(INetTransport as any) private readonly netTransport: INetTransport,
  ) {}

  /**
   * Applies validated appearance to a player.
   *
   * @remarks
   * This method:
   * 1. Validates the appearance data
   * 2. Applies server-side natives (components, props)
   * 3. Emits event to client for client-only natives
   * 4. Returns the validated appearance for persistence
   *
   * @param playerSrc - Player source/client ID
   * @param appearance - Appearance data to apply
   * @returns Result with success status and validated appearance
   */
  async applyAppearance(
    playerSrc: string,
    appearance: PlayerAppearance,
  ): Promise<{ success: boolean; appearance?: PlayerAppearance; errors?: string[] }> {
    const validation = this.validateAppearance(appearance)
    if (!validation.valid) {
      return { success: false, errors: validation.errors }
    }

    const ped = this.playerServer.getPed(playerSrc)
    if (ped === 0) {
      return { success: false, errors: ['Player ped not found'] }
    }

    // Apply server-side natives (components and props)
    this.applyServerSideAppearance(ped, appearance)

    // Emit event to client for client-only natives
    this.netTransport.emitNet('opencore:appearance:apply', parseInt(playerSrc, 10), appearance)

    return { success: true, appearance }
  }

  /**
   * Applies only components and props (server-side available natives).
   *
   * @remarks
   * Use this for quick clothing changes without full appearance update.
   *
   * @param playerSrc - Player source/client ID
   * @param appearance - Partial appearance with components/props only
   * @returns Success status
   */
  applyClothing(
    playerSrc: string,
    appearance: Pick<PlayerAppearance, 'components' | 'props'>,
  ): boolean {
    const ped = this.playerServer.getPed(playerSrc)
    if (ped === 0) {
      return false
    }

    this.applyServerSideAppearance(ped, appearance)
    return true
  }

  /**
   * Resets a player's appearance to default.
   *
   * @param playerSrc - Player source/client ID
   * @returns Success status
   */
  resetAppearance(playerSrc: string): boolean {
    const ped = this.playerServer.getPed(playerSrc)
    if (ped === 0) {
      return false
    }

    this.pedAdapter.setDefaultComponentVariation(ped)

    // Notify client to reset client-only appearance elements
    this.netTransport.emitNet('opencore:appearance:reset', parseInt(playerSrc, 10))

    return true
  }

  /**
   * Validates appearance data without applying it.
   *
   * @remarks
   * Use this to validate appearance data before storing or applying.
   * All validation rules are enforced to prevent invalid/malicious data.
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
          errors.push(`Invalid component ID: ${id} (must be 0-11)`)
        }
        if (data.drawable === undefined || data.drawable < -1) {
          errors.push(`Invalid drawable for component ${id}`)
        }
        if (data.texture === undefined || data.texture < 0) {
          errors.push(`Invalid texture for component ${id}`)
        }
      }
    }

    // Validate props (0-7)
    if (appearance.props) {
      for (const [id, data] of Object.entries(appearance.props)) {
        const propId = parseInt(id, 10)
        if (Number.isNaN(propId) || propId < 0 || propId > 7) {
          errors.push(`Invalid prop ID: ${id} (must be 0-7)`)
        }
        if (data.drawable === undefined) {
          errors.push(`Missing drawable for prop ${id}`)
        }
        if (data.texture === undefined || data.texture < 0) {
          errors.push(`Invalid texture for prop ${id}`)
        }
      }
    }

    // Validate faceFeatures (0-19, values -1.0 to 1.0)
    if (appearance.faceFeatures) {
      for (const [id, value] of Object.entries(appearance.faceFeatures)) {
        const index = parseInt(id, 10)
        if (Number.isNaN(index) || index < 0 || index > 19) {
          errors.push(`Invalid face feature index: ${id} (must be 0-19)`)
        }
        if (typeof value !== 'number' || value < -1.0 || value > 1.0) {
          errors.push(`Face feature ${id} value out of range: ${value} (must be -1.0 to 1.0)`)
        }
      }
    }

    // Validate headBlend
    if (appearance.headBlend) {
      const hb = appearance.headBlend
      if (typeof hb.shapeFirst !== 'number' || hb.shapeFirst < 0 || hb.shapeFirst > 45) {
        errors.push('Invalid shapeFirst (must be 0-45)')
      }
      if (typeof hb.shapeSecond !== 'number' || hb.shapeSecond < 0 || hb.shapeSecond > 45) {
        errors.push('Invalid shapeSecond (must be 0-45)')
      }
      if (typeof hb.skinFirst !== 'number' || hb.skinFirst < 0 || hb.skinFirst > 45) {
        errors.push('Invalid skinFirst (must be 0-45)')
      }
      if (typeof hb.skinSecond !== 'number' || hb.skinSecond < 0 || hb.skinSecond > 45) {
        errors.push('Invalid skinSecond (must be 0-45)')
      }
      if (typeof hb.shapeMix !== 'number' || hb.shapeMix < 0 || hb.shapeMix > 1) {
        errors.push('Invalid shapeMix (must be 0.0-1.0)')
      }
      if (typeof hb.skinMix !== 'number' || hb.skinMix < 0 || hb.skinMix > 1) {
        errors.push('Invalid skinMix (must be 0.0-1.0)')
      }
      if (hb.shapeThird !== undefined && (hb.shapeThird < 0 || hb.shapeThird > 45)) {
        errors.push('Invalid shapeThird (must be 0-45)')
      }
      if (hb.skinThird !== undefined && (hb.skinThird < 0 || hb.skinThird > 45)) {
        errors.push('Invalid skinThird (must be 0-45)')
      }
      if (hb.thirdMix !== undefined && (hb.thirdMix < 0 || hb.thirdMix > 1)) {
        errors.push('Invalid thirdMix (must be 0.0-1.0)')
      }
    }

    // Validate headOverlays (0-12)
    if (appearance.headOverlays) {
      for (const [id, overlay] of Object.entries(appearance.headOverlays)) {
        const overlayId = parseInt(id, 10)
        if (Number.isNaN(overlayId) || overlayId < 0 || overlayId > 12) {
          errors.push(`Invalid overlay ID: ${id} (must be 0-12)`)
        }
        if (typeof overlay.index !== 'number' || overlay.index < 0) {
          errors.push(`Invalid overlay index for ID ${id}`)
        }
        if (typeof overlay.opacity !== 'number' || overlay.opacity < 0 || overlay.opacity > 1) {
          errors.push(`Invalid overlay opacity for ID ${id} (must be 0.0-1.0)`)
        }
        if (overlay.colorType !== undefined && ![0, 1, 2].includes(overlay.colorType)) {
          errors.push(`Invalid overlay colorType for ID ${id} (must be 0, 1, or 2)`)
        }
      }
    }

    // Validate hairColor
    if (appearance.hairColor) {
      if (typeof appearance.hairColor.colorId !== 'number' || appearance.hairColor.colorId < 0) {
        errors.push('Invalid hair colorId')
      }
      if (
        typeof appearance.hairColor.highlightColorId !== 'number' ||
        appearance.hairColor.highlightColorId < 0
      ) {
        errors.push('Invalid hair highlightColorId')
      }
    }

    // Validate eyeColor (0-31)
    if (appearance.eyeColor !== undefined) {
      if (
        typeof appearance.eyeColor !== 'number' ||
        appearance.eyeColor < 0 ||
        appearance.eyeColor > 31
      ) {
        errors.push(`Invalid eye color: ${appearance.eyeColor} (must be 0-31)`)
      }
    }

    // Validate tattoos
    if (appearance.tattoos) {
      if (!Array.isArray(appearance.tattoos)) {
        errors.push('Tattoos must be an array')
      } else {
        for (let i = 0; i < appearance.tattoos.length; i++) {
          const tattoo = appearance.tattoos[i]
          if (!tattoo.collection || typeof tattoo.collection !== 'string') {
            errors.push(`Invalid tattoo collection at index ${i}`)
          }
          if (!tattoo.overlay || typeof tattoo.overlay !== 'string') {
            errors.push(`Invalid tattoo overlay at index ${i}`)
          }
        }
      }
    }

    // Validate model
    if (appearance.model !== undefined) {
      if (typeof appearance.model !== 'string' || appearance.model.length === 0) {
        errors.push('Invalid model (must be a non-empty string)')
      }
    }

    return { valid: errors.length === 0, errors }
  }

  /**
   * Applies server-side appearance natives (components and props only).
   *
   * @param ped - Ped entity handle
   * @param appearance - Appearance data
   */
  private applyServerSideAppearance(
    ped: number,
    appearance: Pick<PlayerAppearance, 'components' | 'props'>,
  ): void {
    // Apply components
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

    // Apply props
    if (appearance.props) {
      for (const [propId, data] of Object.entries(appearance.props)) {
        if (data.drawable === -1) {
          this.pedAdapter.clearProp(ped, parseInt(propId, 10))
        } else {
          this.pedAdapter.setPropIndex(ped, parseInt(propId, 10), data.drawable, data.texture, true)
        }
      }
    }
  }
}
