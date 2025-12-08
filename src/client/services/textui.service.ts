import { injectable } from 'tsyringe'
import type { Vector3 } from '../../utils'

export interface TextUIOptions {
  /** Font (0-8) */
  font?: number
  /** Scale (0.0-1.0+) */
  scale?: number
  /** Color */
  color?: { r: number; g: number; b: number; a: number }
  /** Text alignment (0=center, 1=left, 2=right) */
  alignment?: number
  /** Drop shadow */
  dropShadow?: boolean
  /** Text outline */
  outline?: boolean
  /** Word wrap width (0 = no wrap) */
  wrapWidth?: number
}

export interface Text3DOptions extends TextUIOptions {
  /** Whether to draw a background behind text */
  background?: boolean
  /** Background color */
  backgroundColor?: { r: number; g: number; b: number; a: number }
  /** Background padding */
  backgroundPadding?: number
}

const DEFAULT_OPTIONS: Required<TextUIOptions> = {
  font: 4,
  scale: 0.35,
  color: { r: 255, g: 255, b: 255, a: 255 },
  alignment: 0,
  dropShadow: true,
  outline: false,
  wrapWidth: 0,
}

const DEFAULT_3D_OPTIONS: Required<Text3DOptions> = {
  ...DEFAULT_OPTIONS,
  scale: 0.25,
  background: false,
  backgroundColor: { r: 0, g: 0, b: 0, a: 150 },
  backgroundPadding: 0.002,
}

/**
 * Service for rendering text UI elements on screen and in 3D world.
 */
@injectable()
export class TextUIService {
  private activeTextUI: { text: string; options: Required<TextUIOptions> } | null = null
  private tickHandle: number | null = null

  /**
   * Show persistent text UI at the bottom-right of the screen.
   *
   * @param text - The text to display
   * @param options - Text options
   */
  show(text: string, options: TextUIOptions = {}): void {
    this.activeTextUI = {
      text,
      options: { ...DEFAULT_OPTIONS, ...options },
    }
    this.ensureTickRunning()
  }

  /**
   * Hide the persistent text UI.
   */
  hide(): void {
    this.activeTextUI = null
    this.stopTick()
  }

  /**
   * Check if text UI is currently visible.
   */
  isVisible(): boolean {
    return this.activeTextUI !== null
  }

  /**
   * Draw text on screen for one frame.
   * Call this every frame for persistent display.
   *
   * @param text - The text to draw
   * @param x - Screen X position (0.0-1.0)
   * @param y - Screen Y position (0.0-1.0)
   * @param options - Text options
   */
  drawText(text: string, x: number, y: number, options: TextUIOptions = {}): void {
    const opts = { ...DEFAULT_OPTIONS, ...options }

    SetTextFont(opts.font)
    SetTextScale(opts.scale, opts.scale)
    SetTextColour(opts.color.r, opts.color.g, opts.color.b, opts.color.a)
    SetTextJustification(opts.alignment)

    if (opts.dropShadow) {
      SetTextDropshadow(0, 0, 0, 0, 255)
      SetTextDropShadow()
    }

    if (opts.outline) {
      SetTextOutline()
    }

    if (opts.wrapWidth > 0) {
      SetTextWrap(x, x + opts.wrapWidth)
    }

    if (opts.alignment === 2) {
      SetTextRightJustify(true)
      SetTextWrap(0.0, x)
    }

    BeginTextCommandDisplayText('STRING')
    AddTextComponentString(text)
    EndTextCommandDisplayText(x, y)
  }

  /**
   * Draw 3D text in the game world.
   *
   * @param position - World position
   * @param text - The text to draw
   * @param options - Text options
   */
  drawText3D(position: Vector3, text: string, options: Text3DOptions = {}): void {
    const opts = { ...DEFAULT_3D_OPTIONS, ...options }

    const [onScreen, screenX, screenY] = World3dToScreen2d(position.x, position.y, position.z)
    if (!onScreen) return

    // Calculate distance-based scale
    const camCoords = GetGameplayCamCoords()
    const distance = GetDistanceBetweenCoords(
      camCoords[0],
      camCoords[1],
      camCoords[2],
      position.x,
      position.y,
      position.z,
      true,
    )

    const scale = opts.scale * (1 / distance) * 2
    const scaledScale = Math.max(scale, 0.15)

    // Draw background if enabled
    if (opts.background) {
      const factor = text.length / 300
      DrawRect(
        screenX,
        screenY + opts.backgroundPadding,
        factor + opts.backgroundPadding * 2,
        0.03 + opts.backgroundPadding * 2,
        opts.backgroundColor.r,
        opts.backgroundColor.g,
        opts.backgroundColor.b,
        opts.backgroundColor.a,
      )
    }

    // Draw text
    SetTextScale(scaledScale, scaledScale)
    SetTextFont(opts.font)
    SetTextColour(opts.color.r, opts.color.g, opts.color.b, opts.color.a)
    SetTextCentre(true)

    if (opts.dropShadow) {
      SetTextDropshadow(0, 0, 0, 0, 255)
      SetTextDropShadow()
    }

    if (opts.outline) {
      SetTextOutline()
    }

    BeginTextCommandDisplayText('STRING')
    AddTextComponentString(text)
    EndTextCommandDisplayText(screenX, screenY)
  }

  /**
   * Get text width for layout calculations.
   * Note: This is an approximation based on character count and scale.
   */
  getTextWidth(text: string, _font: number, scale: number): number {
    // Approximate text width based on character count and scale
    // Average character width at scale 1.0 is approximately 0.01
    return text.length * 0.01 * scale
  }

  private ensureTickRunning(): void {
    if (this.tickHandle !== null) return

    this.tickHandle = setTick(() => {
      if (!this.activeTextUI) return

      const { text, options } = this.activeTextUI

      // Draw at bottom-right
      this.drawText(text, 0.985, 0.93, {
        ...options,
        alignment: 2,
      })
    })
  }

  private stopTick(): void {
    if (this.tickHandle !== null) {
      clearTick(this.tickHandle)
      this.tickHandle = null
    }
  }
}
