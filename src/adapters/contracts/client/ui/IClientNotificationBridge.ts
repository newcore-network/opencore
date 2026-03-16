import type { Vector3 } from '../../../../kernel/utils/vector3'

export type ClientNotificationKind =
  | 'feed'
  | 'typed'
  | 'advanced'
  | 'help'
  | 'subtitle'
  | 'floating'

export interface ClientNotificationDefinition {
  kind: ClientNotificationKind
  message: string
  title?: string
  subtitle?: string
  type?: 'info' | 'success' | 'warning' | 'error'
  blink?: boolean
  duration?: number
  beep?: boolean
  looped?: boolean
  flash?: boolean
  saveToBrief?: boolean
  backgroundColor?: number
  worldPosition?: Vector3
}

export abstract class IClientNotificationBridge {
  abstract show(definition: ClientNotificationDefinition): void
  abstract clear(scope?: 'help' | 'subtitle' | 'all'): void
}
