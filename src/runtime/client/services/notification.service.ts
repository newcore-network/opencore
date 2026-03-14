import { inject, injectable } from 'tsyringe'
import { IClientNotificationBridge } from '../../../adapters/contracts/client/ui/IClientNotificationBridge'
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
    @inject(IClientNotificationBridge as any)
    private readonly notifications: IClientNotificationBridge,
    @inject(IClientPlatformBridge as any) private readonly platform: IClientPlatformBridge,
  ) {}

  show(message: string, blink = false): void {
    this.notifications.show(message, blink)
  }

  showWithType(message: string, type: NotificationType = 'info'): void {
    const iconMap: Record<NotificationType, number> = { info: 1, success: 2, warning: 3, error: 4 }
    this.notifications.showTyped(message, iconMap[type])
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

    this.notifications.showAdvanced({
      title,
      subtitle,
      message,
      textureDict,
      textureName,
      iconType,
      flash,
      saveToBrief,
      backgroundColor,
    })
  }

  showHelp(message: string, duration = 5000, beep = true, looped = false): void {
    this.notifications.showHelp(message, duration, beep, looped)
  }

  clearHelp(): void {
    this.notifications.clearHelp()
  }

  showSubtitle(message: string, duration = 2500): void {
    this.notifications.showSubtitle(message, duration)
  }

  clearSubtitle(): void {
    this.notifications.clearSubtitle()
  }

  showFloatingHelp(message: string): void {
    this.notifications.showFloatingHelp(
      message,
      this.platform.getEntityCoords(this.platform.getLocalPlayerPed()),
    )
  }
}
