import { inject, injectable } from 'tsyringe'
import { IClientNotificationBridge } from '../../../adapters/contracts/client/ui/IClientNotificationBridge'
import { IClientPlatformBridge } from './platform-bridge'

@injectable()
export class PlatformNotificationBridge extends IClientNotificationBridge {
  constructor(
    @inject(IClientPlatformBridge as any) private readonly platform: IClientPlatformBridge,
  ) {
    super()
  }

  show(message: string, blink = false): void {
    this.platform.setNotificationTextEntry('STRING')
    this.platform.addTextComponentString(message)
    this.platform.drawNotification(blink, true)
  }

  showTyped(message: string, iconType: number): void {
    this.platform.beginTextCommandThefeedPost('STRING')
    this.platform.addTextComponentString(message)
    this.platform.endTextCommandThefeedPostMessagetext(
      'CHAR_SOCIAL_CLUB',
      'CHAR_SOCIAL_CLUB',
      true,
      iconType,
      '',
      message,
    )
  }

  showAdvanced(options: {
    title: string
    subtitle?: string
    message: string
    textureDict?: string
    textureName?: string
    iconType?: number
    flash?: boolean
    saveToBrief?: boolean
    backgroundColor?: number
  }): void {
    this.platform.setNotificationTextEntry('STRING')
    this.platform.addTextComponentString(options.message)
    if (options.backgroundColor !== undefined) {
      this.platform.setNotificationBackgroundColor(options.backgroundColor)
    }
    this.platform.setNotificationMessage(
      options.textureDict ?? 'CHAR_HUMANDEFAULT',
      options.textureName ?? 'CHAR_HUMANDEFAULT',
      options.flash ?? false,
      options.iconType ?? 1,
      options.title,
      options.subtitle ?? '',
    )
    this.platform.drawNotification(options.flash ?? false, options.saveToBrief ?? true)
  }

  showHelp(message: string, duration: number, beep: boolean, looped: boolean): void {
    this.platform.beginTextCommandDisplayHelp('STRING')
    this.platform.addTextComponentSubstringPlayerName(message)
    this.platform.endTextCommandDisplayHelp(0, looped, beep, duration)
  }

  clearHelp(): void {
    this.platform.clearAllHelpMessages()
  }

  showSubtitle(message: string, duration: number): void {
    this.platform.beginTextCommandPrint('STRING')
    this.platform.addTextComponentSubstringPlayerName(message)
    this.platform.endTextCommandPrint(duration, true)
  }

  clearSubtitle(): void {
    this.platform.clearPrints()
  }

  showFloatingHelp(message: string, position: { x: number; y: number; z: number }): void {
    this.platform.setFloatingHelpTextWorldPosition(1, position)
    this.platform.setFloatingHelpTextStyle(1, 1, 2, -1, 3, 0)
    this.platform.beginTextCommandDisplayHelp('STRING')
    this.platform.addTextComponentSubstringPlayerName(message)
    this.platform.endTextCommandDisplayHelp(2, false, false, -1)
  }
}
