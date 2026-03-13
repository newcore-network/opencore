import { inject, injectable } from 'tsyringe'
import { IClientPlatformBridge } from '../adapter/platform-bridge'

export type NotificationType = 'info' | 'success' | 'warning' | 'error'

export interface AdvancedNotificationOptions {
  title: string
  subtitle?: string
  message: string
  textureDict?: string
  textureName?: string
  iconType?: number
  flash?: boolean
  saveToBrief?: boolean
  backgroundColor?: number
}

@injectable()
export class NotificationService {
  constructor(
    @inject(IClientPlatformBridge as any) private readonly platform: IClientPlatformBridge,
  ) {}

  show(message: string, blink = false): void {
    this.platform.setNotificationTextEntry('STRING')
    this.platform.addTextComponentString(message)
    this.platform.drawNotification(blink, true)
  }

  showWithType(message: string, type: NotificationType = 'info'): void {
    const iconMap: Record<NotificationType, number> = { info: 1, success: 2, warning: 3, error: 4 }
    this.platform.beginTextCommandThefeedPost('STRING')
    this.platform.addTextComponentString(message)
    this.platform.endTextCommandThefeedPostMessagetext(
      'CHAR_SOCIAL_CLUB',
      'CHAR_SOCIAL_CLUB',
      true,
      iconMap[type],
      '',
      message,
    )
  }

  showAdvanced(options: AdvancedNotificationOptions): void {
    const {
      title,
      subtitle = '',
      message,
      textureDict = 'CHAR_HUMANDEFAULT',
      textureName = 'CHAR_HUMANDEFAULT',
      iconType = 1,
      flash = false,
      saveToBrief = true,
      backgroundColor,
    } = options

    this.platform.setNotificationTextEntry('STRING')
    this.platform.addTextComponentString(message)
    if (backgroundColor !== undefined) this.platform.setNotificationBackgroundColor(backgroundColor)
    this.platform.setNotificationMessage(textureDict, textureName, flash, iconType, title, subtitle)
    this.platform.drawNotification(flash, saveToBrief)
  }

  showHelp(message: string, duration = 5000, beep = true, looped = false): void {
    this.platform.beginTextCommandDisplayHelp('STRING')
    this.platform.addTextComponentSubstringPlayerName(message)
    this.platform.endTextCommandDisplayHelp(0, looped, beep, duration)
  }

  clearHelp(): void {
    this.platform.clearAllHelpMessages()
  }

  showSubtitle(message: string, duration = 2500): void {
    this.platform.beginTextCommandPrint('STRING')
    this.platform.addTextComponentSubstringPlayerName(message)
    this.platform.endTextCommandPrint(duration, true)
  }

  clearSubtitle(): void {
    this.platform.clearPrints()
  }

  showFloatingHelp(message: string): void {
    const position = this.platform.getEntityCoords(this.platform.getLocalPlayerPed())
    this.platform.setFloatingHelpTextWorldPosition(1, position)
    this.platform.setFloatingHelpTextStyle(1, 1, 2, -1, 3, 0)
    this.platform.beginTextCommandDisplayHelp('STRING')
    this.platform.addTextComponentSubstringPlayerName(message)
    this.platform.endTextCommandDisplayHelp(2, false, false, -1)
  }
}
