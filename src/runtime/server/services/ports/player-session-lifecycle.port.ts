import { type Player } from '../../entities'
import { type LinkedID } from '../types/linked-id'
import { type PlayerSession } from '../types/player-session.object'

export abstract class PlayerSessionLifecyclePort {
  abstract bind(clientID: number, identifiers?: PlayerSession['identifiers']): Player
  abstract unbind(clientID: number): void
  abstract linkAccount(clientID: number, accountID: LinkedID): void
}
