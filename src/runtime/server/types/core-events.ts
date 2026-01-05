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

export type CoreEventMap = {
  'core:playerSessionCreated': PlayerSessionCreatedPayload
  'core:playerSessionDestroyed': PlayerSessionDestroyedPayload
  'core:transfer:completed': TransferCompletedPayload
  'core:playerFullyConnected': Player
}
