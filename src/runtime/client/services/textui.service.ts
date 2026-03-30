import { inject, injectable } from 'tsyringe'
import { Vector3 } from '../../../kernel/utils/vector3'
import { IClientPlatformBridge } from '../adapter/platform-bridge'
import { IClientRuntimeBridge } from '../adapter/runtime-bridge'

export interface TextUIOptions {
  font?: number
  scale?: number
  color?: { r: number; g: number; b: number; a: number }
  alignment?: number
  dropShadow?: boolean
  outline?: boolean
  wrapWidth?: number
}

export interface Text3DOptions extends TextUIOptions {
  background?: boolean
  backgroundColor?: { r: number; g: number; b: number; a: number }
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

@injectable()
export class TextUIService {
  private activeTextUI: { text: string; options: Required<TextUIOptions> } | null = null
  private tickHandle: unknown = null

  constructor(
    @inject(IClientPlatformBridge as any) private readonly platform: IClientPlatformBridge,
    @inject(IClientRuntimeBridge as any) private readonly runtime: IClientRuntimeBridge,
  ) {}

  show(text: string, options: TextUIOptions = {}): void {
    this.activeTextUI = { text, options: { ...DEFAULT_OPTIONS, ...options } }
    this.ensureTickRunning()
  }

  hide(): void {
    this.activeTextUI = null
    this.stopTick()
  }

  isVisible(): boolean {
    return this.activeTextUI !== null
  }

  drawText(text: string, x: number, y: number, options: TextUIOptions = {}): void {
    const opts = { ...DEFAULT_OPTIONS, ...options }
    this.platform.setTextFont(opts.font)
    this.platform.setTextScale(opts.scale)
    this.platform.setTextColour(opts.color)
    this.platform.setTextJustification(opts.alignment)

    if (opts.dropShadow) {
      this.platform.setTextDropshadow(0, 0, 0, 0, 255)
      this.platform.setTextDropShadow()
    }
    if (opts.outline) this.platform.setTextOutline()
    if (opts.wrapWidth > 0) this.platform.setTextWrap(x, x + opts.wrapWidth)
    if (opts.alignment === 2) {
      this.platform.setTextRightJustify(true)
      this.platform.setTextWrap(0.0, x)
    }

    this.platform.beginTextCommandDisplayText('STRING')
    this.platform.addTextComponentString(text)
    this.platform.endTextCommandDisplayText(x, y)
  }

  drawText3D(position: Vector3, text: string, options: Text3DOptions = {}): void {
    const opts = { ...DEFAULT_3D_OPTIONS, ...options }
    const screen = this.platform.worldToScreen(position)
    if (!screen.onScreen) return

    const distance = this.platform.getDistanceBetweenCoords(
      this.platform.getGameplayCamCoords(),
      position,
      true,
    )
    const scale = opts.scale * (1 / Math.max(distance, 0.001)) * 2
    const scaledScale = Math.max(scale, 0.15)

    if (opts.background) {
      const factor = text.length / 300
      this.platform.drawRect(
        screen.x,
        screen.y + opts.backgroundPadding,
        factor + opts.backgroundPadding * 2,
        0.03 + opts.backgroundPadding * 2,
        opts.backgroundColor.r,
        opts.backgroundColor.g,
        opts.backgroundColor.b,
        opts.backgroundColor.a,
      )
    }

    this.platform.setTextScale(scaledScale)
    this.platform.setTextFont(opts.font)
    this.platform.setTextColour(opts.color)
    this.platform.setTextCentre(true)
    if (opts.dropShadow) {
      this.platform.setTextDropshadow(0, 0, 0, 0, 255)
      this.platform.setTextDropShadow()
    }
    if (opts.outline) this.platform.setTextOutline()

    this.platform.beginTextCommandDisplayText('STRING')
    this.platform.addTextComponentString(text)
    this.platform.endTextCommandDisplayText(screen.x, screen.y)
  }

  getTextWidth(text: string, _font: number, scale: number): number {
    return text.length * 0.01 * scale
  }

  private ensureTickRunning(): void {
    if (this.tickHandle !== null) return
    this.tickHandle = this.runtime.setTick(() => {
      if (!this.activeTextUI) return
      const { text, options } = this.activeTextUI
      this.drawText(text, 0.985, 0.93, { ...options, alignment: 2 })
    })
  }

  private stopTick(): void {
    if (this.tickHandle !== null) {
      this.runtime.clearTick(this.tickHandle)
      this.tickHandle = null
    }
  }
}
