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
  clientId: number
  license: string
}

export type CoreEventMap = {
  'core:playerSessionCreated': PlayerSessionCreatedPayload
  'core:playerSessionDestroyed': PlayerSessionDestroyedPayload
  'core:transfer:completed': TransferCompletedPayload
  'core:playerFullyConnected': PlayerFullyConnectedPayload
}
