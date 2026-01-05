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

export type InternalEventMap = {
  'internal:playerSessionCreated': PlayerSessionCreatedPayload
  'internal:playerSessionDestroyed': PlayerSessionDestroyedPayload
  'internal:transfer:completed': TransferCompletedPayload
  'internal:playerFullyConnected': Player
}
