import type { Player } from '../../entities/player'

export type NetEventInvalidPayloadReason = 'zod' | 'arg_count' | 'security_error' | 'unknown'

export interface NetEventInvalidPayloadContext {
  event: string
  reason: NetEventInvalidPayloadReason
  playerId: number
  accountId?: string
  invalidCount: number
  zodSummary?: string[]
  receivedArgsCount?: number
  expectedArgsCount?: number
}

export abstract class NetEventSecurityObserverContract {
  abstract onInvalidPayload(player: Player, ctx: NetEventInvalidPayloadContext): Promise<void>
}
