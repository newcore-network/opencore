import { injectable } from 'tsyringe'
import { PlayerAppearance } from '../interfaces/appearance.interface'

@injectable()
export class AppearanceService {
  async applyAppearance(ped: number, appearance: PlayerAppearance): Promise<void> {
    if (appearance.components) {
      for (const [componentId, data] of Object.entries(appearance.components)) {
        SetPedComponentVariation(ped, parseInt(componentId), data.drawable, data.texture, 2)
      }
    }

    if (appearance.props) {
      for (const [propId, data] of Object.entries(appearance.props)) {
        if (data.drawable === -1) {
          ClearPedProp(ped, parseInt(propId))
        } else {
          SetPedPropIndex(ped, parseInt(propId), data.drawable, data.texture, true)
        }
      }
    }

    if (appearance.faceFeatures) {
      for (const [index, value] of Object.entries(appearance.faceFeatures)) {
        SetPedFaceFeature(ped, parseInt(index), value)
      }
    }

    if (appearance.headBlend) {
      const { shapeFirst, shapeSecond, shapeMix, skinFirst, skinSecond, skinMix } =
        appearance.headBlend
      SetPedHeadBlendData(
        ped,
        shapeFirst,
        shapeSecond,
        0,
        skinFirst,
        skinSecond,
        0,
        shapeMix,
        skinMix,
        0,
        false,
      )
    }
  }

  async getAppearance(ped: number): Promise<PlayerAppearance> {
    const appearance: PlayerAppearance = {
      components: {},
      props: {},
      faceFeatures: {},
    }

    // Components (0–11)
    for (let i = 0; i <= 11; i++) {
      const drawable = GetPedDrawableVariation(ped, i)
      const texture = GetPedTextureVariation(ped, i)

      if (drawable !== -1) {
        appearance.components![i] = { drawable, texture }
      }
    }

    // Props (0–7)
    for (let i = 0; i <= 7; i++) {
      const drawable = GetPedPropIndex(ped, i)
      const texture = GetPedPropTextureIndex(ped, i)

      if (drawable !== -1) {
        appearance.props![i] = { drawable, texture }
      }
    }

    return appearance
  }

  validateAppearance(appearance: Partial<PlayerAppearance>): boolean {
    if (!appearance) return false

    if (appearance.components) {
      for (const [id, data] of Object.entries(appearance.components)) {
        const componentId = parseInt(id)
        if (isNaN(componentId) || componentId < 0 || componentId > 11) return false
        if (data.drawable === undefined || data.texture === undefined) return false
      }
    }

    if (appearance.props) {
      for (const [id, data] of Object.entries(appearance.props)) {
        const propId = parseInt(id)
        if (isNaN(propId) || propId < 0 || propId > 7) return false
        if (data.drawable === undefined || data.texture === undefined) return false
      }
    }

    return true
  }
}
