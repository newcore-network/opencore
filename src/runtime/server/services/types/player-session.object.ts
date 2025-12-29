import type { LinkedID } from './linked-id'

export interface PlayerSession {
  clientID: number
  accountID?: LinkedID
  identifiers?: {
    license?: string
    steam?: string
    discord?: string
  }
  meta: Record<string, unknown>
}
