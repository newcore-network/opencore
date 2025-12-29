import type { HeadBlendData } from '../../kernel/shared'
import { IPedAppearanceClient } from '../contracts/IPedAppearanceClient'

/**
 * Node.js stub implementation of client-side ped appearance adapter.
 *
 * @remarks
 * This is a no-op implementation for testing in Node.js environment.
 * All methods return default values or do nothing.
 */
export class NodePedAppearanceClient extends IPedAppearanceClient {
  setComponentVariation(): void {}
  setPropIndex(): void {}
  clearProp(): void {}
  setDefaultComponentVariation(): void {}
  setHeadBlendData(_ped: number, _data: HeadBlendData): void {}
  setFaceFeature(): void {}
  setHeadOverlay(): void {}
  setHeadOverlayColor(): void {}
  setHairColor(): void {}
  setEyeColor(): void {}
  addDecoration(): void {}
  clearDecorations(): void {}

  getDrawableVariation(): number {
    return 0
  }

  getTextureVariation(): number {
    return 0
  }

  getPropIndex(): number {
    return -1
  }

  getPropTextureIndex(): number {
    return 0
  }

  getNumDrawableVariations(): number {
    return 0
  }

  getNumTextureVariations(): number {
    return 0
  }

  getNumPropDrawableVariations(): number {
    return 0
  }

  getNumPropTextureVariations(): number {
    return 0
  }

  getNumOverlayValues(): number {
    return 0
  }

  getNumHairColors(): number {
    return 0
  }

  getNumMakeupColors(): number {
    return 0
  }
}
