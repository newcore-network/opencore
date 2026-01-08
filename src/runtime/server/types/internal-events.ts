import { Player } from '../entities'

export interface PlayerSessionCreatedPayload {
  clientId: number
  license: string
}

export interface PlayerSessionDestroyedPayload {
  clientId: number
}

export interface TransferCompletedPayload {
  playerId: number
  amount: number
  targetId: number
}

export interface PlayerFullyConnectedPayload {
  player: Player
}

export interface PlayerSessionRecoveredPayload {
  clientId: number
  player: Player
  license: string | undefined
}

export type InternalEventMap = {
  'internal:playerSessionCreated': PlayerSessionCreatedPayload
  'internal:playerSessionDestroyed': PlayerSessionDestroyedPayload
  'internal:transfer:completed': TransferCompletedPayload
  'internal:playerFullyConnected': PlayerFullyConnectedPayload
  'internal:playerSessionRecovered': PlayerSessionRecoveredPayload
}
