import { Player } from '../entities'

/**
 * Emitted when a player session is created in the framework session lifecycle.
 */
export interface PlayerSessionCreatedPayload {
  clientId: number
  license: string | undefined
}

/**
 * Emitted when a player session is destroyed in the framework session lifecycle.
 */
export interface PlayerSessionDestroyedPayload {
  clientId: number
}

/**
 * Emitted when the framework considers the player fully connected and the runtime-specific
 * {@link Player} entity can be consumed safely by application code.
 */
export interface PlayerFullyConnectedPayload {
  player: Player
}

/**
 * Emitted when the framework recreates a player session after resource restart recovery.
 */
export interface PlayerSessionRecoveredPayload {
  clientId: number
  player: Player
  license: string | undefined
}

/**
 * Serialized transport payload for `internal:playerFullyConnected` used across `CORE -> RESOURCE`.
 */
export interface PlayerFullyConnectedTransportPayload {
  clientId: number
}

/**
 * Serialized transport payload for `internal:playerSessionRecovered` used across `CORE -> RESOURCE`.
 */
export interface PlayerSessionRecoveredTransportPayload {
  clientId: number
  license: string | undefined
}

/**
 * Internal transport contract used by the framework bridge when delivering framework events
 * between different server runtimes.
 */
export type FrameworkTransportEventsMap = {
  'internal:playerSessionCreated': PlayerSessionCreatedPayload
  'internal:playerSessionDestroyed': PlayerSessionDestroyedPayload
  'internal:playerFullyConnected': PlayerFullyConnectedTransportPayload
  'internal:playerSessionRecovered': PlayerSessionRecoveredTransportPayload
}

/**
 * Envelope emitted through the internal framework bridge.
 */
export interface FrameworkEventEnvelope<E extends keyof FrameworkTransportEventsMap> {
  event: E
  payload: FrameworkTransportEventsMap[E]
}

/**
 * Public payload map consumed by {@link OnFrameworkEvent} and `onFrameworkEvent(...)`.
 */
export type FrameworkEventsMap = {
  'internal:playerSessionCreated': PlayerSessionCreatedPayload
  'internal:playerSessionDestroyed': PlayerSessionDestroyedPayload
  'internal:playerFullyConnected': PlayerFullyConnectedPayload
  'internal:playerSessionRecovered': PlayerSessionRecoveredPayload
}
