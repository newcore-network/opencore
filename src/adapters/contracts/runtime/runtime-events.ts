export const RUNTIME_EVENTS = {
  playerJoining: 'playerJoining',
  playerDropped: 'playerDropped',
  serverResourceStop: 'onServerResourceStop',
} as const

export type RuntimeEventName = (typeof RUNTIME_EVENTS)[keyof typeof RUNTIME_EVENTS]

export type RuntimeEventMap = Record<RuntimeEventName, string>

export const DEFAULT_RUNTIME_EVENT_MAP: RuntimeEventMap = {
  [RUNTIME_EVENTS.playerJoining]: RUNTIME_EVENTS.playerJoining,
  [RUNTIME_EVENTS.playerDropped]: RUNTIME_EVENTS.playerDropped,
  [RUNTIME_EVENTS.serverResourceStop]: RUNTIME_EVENTS.serverResourceStop,
}
