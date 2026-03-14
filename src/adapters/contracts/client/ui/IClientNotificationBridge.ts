import type { Vector3 } from '../../../../kernel/utils/vector3'

export abstract class IClientNotificationBridge {
  abstract show(message: string, blink?: boolean): void
  abstract showTyped(message: string, iconType: number): void
  abstract showAdvanced(options: {
    title: string
    subtitle?: string
    message: string
    textureDict?: string
    textureName?: string
    iconType?: number
    flash?: boolean
    saveToBrief?: boolean
    backgroundColor?: number
  }): void
  abstract showHelp(message: string, duration: number, beep: boolean, looped: boolean): void
  abstract clearHelp(): void
  abstract showSubtitle(message: string, duration: number): void
  abstract clearSubtitle(): void
  abstract showFloatingHelp(message: string, position: Vector3): void
}
