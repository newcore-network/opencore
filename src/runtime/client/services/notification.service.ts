import { inject, injectable } from 'tsyringe'
import {
  IClientNotificationBridge,
  type ClientNotificationDefinition,
} from '../../../adapters/contracts/client/ui/IClientNotificationBridge'
import { IClientLocalPlayerBridge } from '../adapter/local-player-bridge'

export type NotificationType = 'info' | 'success' | 'warning' | 'error'

export interface AdvancedNotificationOptions {
  title: string
  subtitle?: string
  message: string
  flash?: boolean
  saveToBrief?: boolean
  backgroundColor?: number
}

@injectable()
export class NotificationService {
  constructor(
    @inject(IClientNotificationBridge as any)
    private readonly notifications: IClientNotificationBridge,
    @inject(IClientLocalPlayerBridge as any) private readonly localPlayer: IClientLocalPlayerBridge,
  ) {}

  show(message: string, blink = false): void {
    this.notifications.show({ kind: 'feed', message, blink, saveToBrief: true })
  }

  showWithType(message: string, type: NotificationType = 'info'): void {
    this.notifications.show({ kind: 'typed', message, type })
  }

  showAdvanced(options: AdvancedNotificationOptions): void {
    this.notifications.show({
      kind: 'advanced',
      title: options.title,
      subtitle: options.subtitle,
      message: options.message,
      flash: options.flash,
      saveToBrief: options.saveToBrief,
      backgroundColor: options.backgroundColor,
    })
  }

  showHelp(message: string, duration = 5000, beep = true, looped = false): void {
    this.notifications.show({ kind: 'help', message, duration, beep, looped })
  }

  clearHelp(): void {
    this.notifications.clear('help')
  }

  showSubtitle(message: string, duration = 2500): void {
    this.notifications.show({ kind: 'subtitle', message, duration })
  }

  clearSubtitle(): void {
    this.notifications.clear('subtitle')
  }

  showFloatingHelp(message: string): void {
    this.notifications.show({
      kind: 'floating',
      message,
      worldPosition: this.localPlayer.getPosition(),
    })
  }

  showRaw(definition: ClientNotificationDefinition): void {
    this.notifications.show(definition)
  }
}
