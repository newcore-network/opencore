import { Player } from '../entities'

export interface PlayerSessionCreatedPayload {
  clientId: number
  license: string | undefined
}

export interface PlayerSessionDestroyedPayload {
  clientId: number
}

export interface PlayerFullyConnectedPayload {
  player: Player
}

export interface PlayerSessionRecoveredPayload {
  clientId: number
  player: Player
  license: string | undefined
}

export type FrameworkEventsMap = {
  'internal:playerSessionCreated': PlayerSessionCreatedPayload
  'internal:playerSessionDestroyed': PlayerSessionDestroyedPayload
  'internal:playerFullyConnected': PlayerFullyConnectedPayload
  'internal:playerSessionRecovered': PlayerSessionRecoveredPayload
}
