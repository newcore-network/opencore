export type RuntimeContext = 'server' | 'client'

export interface EventContext {
  clientId?: number
  raw?: unknown
}
