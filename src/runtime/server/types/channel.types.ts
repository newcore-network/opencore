import { RGB } from '../../../kernel/utils/rgb'
import { Player } from '../entities'

export enum ChannelType {
  GLOBAL = 'global',
  PROXIMITY = 'proximity',
  RADIO = 'radio',
  PHONE = 'phone',
  GROUP = 'group',
  ADMIN = 'admin',
  CUSTOM = 'custom',
}

export interface ChannelMetadata {
  type: ChannelType
  frequency?: number
  maxRange?: number
  encrypted?: boolean
  persistent?: boolean
  [key: string]: unknown
}

export interface ChannelMessage {
  channelId: string
  sender: Player
  message: string
  author?: string
  color?: RGB
  timestamp: number
}

export interface ChannelSubscription {
  player: Player
  subscribedAt: number
  metadata?: Record<string, unknown>
}

export interface ChannelConfig {
  id: string
  metadata: ChannelMetadata
  allowDuplicateSubscribers?: boolean
  maxSubscribers?: number
  requirePermission?: string
}

export interface IChannelValidator {
  canSubscribe(player: Player, channelId: string): boolean
  canBroadcast(player: Player, channelId: string): boolean
  canCreate(player: Player, channelId: string): boolean
}
