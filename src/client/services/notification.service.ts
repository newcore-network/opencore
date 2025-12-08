import { injectable } from 'tsyringe'

export type NotificationType = 'info' | 'success' | 'warning' | 'error'

export interface AdvancedNotificationOptions {
  /** Notification title */
  title: string
  /** Notification subtitle */
  subtitle?: string
  /** Message text */
  message: string
  /** Texture dictionary for the icon */
  textureDict?: string
  /** Texture name for the icon */
  textureName?: string
  /** Icon type (1-7) */
  iconType?: number
  /** Flash the notification */
  flash?: boolean
  /** Save to brief (map menu) */
  saveToBrief?: boolean
  /** Background color index */
  backgroundColor?: number
}

/**
 * Service for displaying native GTA V notifications.
 */
@injectable()
export class NotificationService {
  /**
   * Show a simple notification on screen.
   *
   * @param message - The message to display
   * @param blink - Whether the notification should blink
   */
  show(message: string, blink = false): void {
    SetNotificationTextEntry('STRING')
    AddTextComponentString(message)
    DrawNotification(blink, true)
  }

  /**
   * Show a notification with a type indicator using throbber icons.
   *
   * @param message - The message to display
   * @param type - The notification type
   */
  showWithType(message: string, type: NotificationType = 'info'): void {
    const iconMap: Record<NotificationType, number> = {
      info: 1,
      success: 2,
      warning: 3,
      error: 4,
    }

    BeginTextCommandThefeedPost('STRING')
    AddTextComponentString(message)
    EndTextCommandThefeedPostMessagetext(
      'CHAR_SOCIAL_CLUB',
      'CHAR_SOCIAL_CLUB',
      true,
      iconMap[type],
      '',
      message,
    )
  }

  /**
   * Show an advanced notification with picture/icon.
   *
   * @param options - Advanced notification options
   */
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

    SetNotificationTextEntry('STRING')
    AddTextComponentString(message)

    if (backgroundColor !== undefined) {
      SetNotificationBackgroundColor(backgroundColor)
    }

    SetNotificationMessage(textureDict, textureName, flash, iconType, title, subtitle)
    DrawNotification(flash, saveToBrief)
  }

  /**
   * Show a help notification (appears at top-left).
   *
   * @param message - The help message
   * @param duration - How long to show in milliseconds (-1 for indefinite)
   * @param beep - Play a beep sound
   * @param looped - Keep showing until cleared
   */
  showHelp(message: string, duration = 5000, beep = true, looped = false): void {
    BeginTextCommandDisplayHelp('STRING')
    AddTextComponentSubstringPlayerName(message)
    EndTextCommandDisplayHelp(0, looped, beep, duration)
  }

  /**
   * Clear all help messages.
   */
  clearHelp(): void {
    ClearAllHelpMessages()
  }

  /**
   * Show a subtitle (centered at bottom of screen).
   *
   * @param message - The subtitle text
   * @param duration - Duration in milliseconds
   */
  showSubtitle(message: string, duration = 2500): void {
    BeginTextCommandPrint('STRING')
    AddTextComponentSubstringPlayerName(message)
    EndTextCommandPrint(duration, true)
  }

  /**
   * Clear the current subtitle.
   */
  clearSubtitle(): void {
    ClearPrints()
  }

  /**
   * Show a floating help text above the player's head.
   *
   * @param message - The message to display
   */
  showFloatingHelp(message: string): void {
    const [x, y, z] = GetEntityCoords(PlayerPedId(), true)
    SetFloatingHelpTextWorldPosition(1, x, y, z)
    SetFloatingHelpTextStyle(1, 1, 2, -1, 3, 0)
    BeginTextCommandDisplayHelp('STRING')
    AddTextComponentSubstringPlayerName(message)
    EndTextCommandDisplayHelp(2, false, false, -1)
  }
}

