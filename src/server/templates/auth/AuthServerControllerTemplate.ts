import type { PlayerSessionCreatedPayload } from '../../types/core-events'
import type { Player } from '../../entities/player'

export interface AuthServerControllerTemplate {
  handleSessionCreated(session: PlayerSessionCreatedPayload): void
  handleLoginAttemp(player: Player, username: string, password: string): Promise<void>
}
