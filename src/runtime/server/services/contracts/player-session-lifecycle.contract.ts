import { type Player } from '../../entities'
import { type LinkedID, type PlayerSession } from '../core/player.service'

export abstract class PlayerSessionLifecycleContract {
  abstract bind(clientID: number, identifiers?: PlayerSession['identifiers']): Player
  abstract unbind(clientID: number): void
  abstract linkAccount(clientID: number, accountID: LinkedID): void
}
