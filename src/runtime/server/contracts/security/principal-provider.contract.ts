import { LinkedID } from '../../types/linked-id'
import { Principal } from '../../types/principal.type'
import { Player } from '../../entities/player'

/**
 * **Authorization**
 *
 * This abstract class defines how the Security Layer retrieves user permissions.
 * The Framework does not know about your persistence layer (SQL, Mongo, JSON or API); it relies on
 * your implementation of this provider to resolve a `Principal`.
 *
 * @example
 * ```ts
 * // In your game resource:
 * class MyPrincipal implements PrincipalProviderContract { ... }
 * ```
 */
export abstract class PrincipalProviderContract {
  /**
   * Retrieves the security principal (Role/Permissions) for a connected player.
   *
   * **Performance Note:** This method is called frequently (on every guarded interaction).
   * It is highly recommended to cache the result in memory (e.g., in `Player.session`).
   *
   * @param player - The active Server Player entity.
   * @returns A Promise resolving to the `Principal` data, or `null` if the player is not authenticated.
   */
  abstract getPrincipal(player: Player): Promise<Principal | null>

  /**
   * Forces a refresh of the player's permissions from the persistence layer.
   * Useful when a player is promoted/demoted while online.
   *
   * @param player - The active Server Player entity to refresh.
   */

  abstract refreshPrincipal(player: Player): Promise<void>
  /**
   * Retrieves a principal by their Account ID, even if they are offline.
   * Useful for web panels, discord bots, or offline bans.
   *
   * @param linkedID - The unique linked ID (Account ID).
   * @returns The Principal data or null.
   */
  abstract getPrincipalByLinkedID(linkedID: LinkedID): Promise<Principal | null>
}
