import { injectable } from 'tsyringe'
import { AppearanceValidationResult, PlayerAppearance } from '../../../kernel/shared'

@injectable()
export class AppearanceService {
  validateAppearance(appearance: Partial<PlayerAppearance>): AppearanceValidationResult {
    const errors: string[] = []

    if (!appearance) {
      return { valid: false, errors: ['Appearance data is null or undefined'] }
    }

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

    if (appearance.headBlend) {
      const hb = appearance.headBlend
      if (typeof hb.shapeFirst !== 'number' || hb.shapeFirst < 0 || hb.shapeFirst > 45)
        errors.push('Invalid shapeFirst (must be 0-45)')
      if (typeof hb.shapeSecond !== 'number' || hb.shapeSecond < 0 || hb.shapeSecond > 45)
        errors.push('Invalid shapeSecond (must be 0-45)')
      if (typeof hb.skinFirst !== 'number' || hb.skinFirst < 0 || hb.skinFirst > 45)
        errors.push('Invalid skinFirst (must be 0-45)')
      if (typeof hb.skinSecond !== 'number' || hb.skinSecond < 0 || hb.skinSecond > 45)
        errors.push('Invalid skinSecond (must be 0-45)')
      if (typeof hb.shapeMix !== 'number' || hb.shapeMix < 0 || hb.shapeMix > 1)
        errors.push('Invalid shapeMix (must be 0.0-1.0)')
      if (typeof hb.skinMix !== 'number' || hb.skinMix < 0 || hb.skinMix > 1)
        errors.push('Invalid skinMix (must be 0.0-1.0)')
      if (hb.shapeThird !== undefined && (hb.shapeThird < 0 || hb.shapeThird > 45))
        errors.push('Invalid shapeThird (must be 0-45)')
      if (hb.skinThird !== undefined && (hb.skinThird < 0 || hb.skinThird > 45))
        errors.push('Invalid skinThird (must be 0-45)')
      if (hb.thirdMix !== undefined && (hb.thirdMix < 0 || hb.thirdMix > 1))
        errors.push('Invalid thirdMix (must be 0.0-1.0)')
    }

    if (appearance.headOverlays) {
      for (const [id, overlay] of Object.entries(appearance.headOverlays)) {
        const overlayId = parseInt(id, 10)
        if (Number.isNaN(overlayId) || overlayId < 0 || overlayId > 12) {
          errors.push(`Invalid overlay ID: ${id} (must be 0-12)`)
        }
        if (typeof overlay.index !== 'number' || overlay.index < 0)
          errors.push(`Invalid overlay index for ID ${id}`)
        if (typeof overlay.opacity !== 'number' || overlay.opacity < 0 || overlay.opacity > 1) {
          errors.push(`Invalid overlay opacity for ID ${id} (must be 0.0-1.0)`)
        }
        if (overlay.colorType !== undefined && ![0, 1, 2].includes(overlay.colorType)) {
          errors.push(`Invalid overlay colorType for ID ${id} (must be 0, 1, or 2)`)
        }
      }
    }

    if (appearance.hairColor) {
      if (typeof appearance.hairColor.colorId !== 'number' || appearance.hairColor.colorId < 0)
        errors.push('Invalid hair colorId')
      if (
        typeof appearance.hairColor.highlightColorId !== 'number' ||
        appearance.hairColor.highlightColorId < 0
      ) {
        errors.push('Invalid hair highlightColorId')
      }
    }

    if (appearance.eyeColor !== undefined) {
      if (
        typeof appearance.eyeColor !== 'number' ||
        appearance.eyeColor < 0 ||
        appearance.eyeColor > 31
      ) {
        errors.push(`Invalid eye color: ${appearance.eyeColor} (must be 0-31)`)
      }
    }

    if (appearance.tattoos) {
      if (!Array.isArray(appearance.tattoos)) {
        errors.push('Tattoos must be an array')
      } else {
        for (let i = 0; i < appearance.tattoos.length; i++) {
          const tattoo = appearance.tattoos[i]
          if (!tattoo.collection || typeof tattoo.collection !== 'string')
            errors.push(`Invalid tattoo collection at index ${i}`)
          if (!tattoo.overlay || typeof tattoo.overlay !== 'string')
            errors.push(`Invalid tattoo overlay at index ${i}`)
        }
      }
    }

    if (appearance.model !== undefined) {
      if (typeof appearance.model !== 'string' || appearance.model.length === 0) {
        errors.push('Invalid model (must be a non-empty string)')
      }
    }

    return { valid: errors.length === 0, errors }
  }
}
