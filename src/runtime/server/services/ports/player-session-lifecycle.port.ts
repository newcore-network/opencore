import { Player } from '../../entities'
import { LinkedID } from '../types/linked-id'
import { PlayerSession } from '../types/player-session.object'

/**
 * Core port responsible for managing the lifecycle of player sessions.
 *
 * @remarks
 * This port defines the authoritative boundary for creating, linking, and
 * destroying player sessions within the framework.
 *
 * Implementations of this port own the session state and are expected to be
 * invoked in response to connection, authentication, and disconnection events.
 */
export abstract class PlayerSessionLifecyclePort {
  /**
   * Creates and binds a new player session to a connected client.
   *
   * @remarks
   * This method is typically called when a player joins the server or completes
   * the initial handshake phase. The returned {@link Player} represents the
   * runtime session associated with the client.
   *
   * @param clientID - The FiveM server client ID (`source`).
   * @param identifiers - Optional platform identifiers (license, steam, etc.).
   * @returns The newly created {@link Player} instance.
   */
  abstract bind(clientID: number, identifiers?: PlayerSession['identifiers']): Player

  /**
   * Terminates and removes the player session associated with a client.
   *
   * @remarks
   * This method should be called when the client disconnects to ensure
   * session state is properly cleaned up and memory is released.
   *
   * @param clientID - The FiveM server client ID (`source`).
   */
  abstract unbind(clientID: number): void

  /**
   * Links an authenticated account to an existing player session.
   *
   * @remarks
   * This method is typically invoked after successful authentication or
   * character selection to associate persistent data with the active session.
   *
   * @param clientID - The FiveM server client ID (`source`).
   * @param accountID - The persistent account identifier.
   */
  abstract linkAccount(clientID: number, accountID: LinkedID): void
}
