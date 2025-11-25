import { injectable } from "tsyringe";
import type { UUIDTypes } from "uuid";
import { ServerPlayer, PlayerSession, PlayerId } from "./player";

/**
 * Core-level player/session manager.
 *
 * - Tracks clientID ↔ playerId associations.
 * - Exposes a typed API to retrieve ServerPlayer instances.
 * - Provides a small metadata bag per player.
 *
 * It does NOT contain gameplay logic or access to persistence.
 */
@injectable()
export class PlayerManager {
  /** Maps FiveM clientID → ServerPlayer */
  private playersByClient = new Map<number, ServerPlayer>();
  /**
   * Creates (or rebinds) a ServerPlayer for a given clientID and playerId.
   * Usually called after a successful login flow in your auth module.
   *
   * @param clientID - FiveM player handle
   * @param accountID - Domain player identifier (UUID/string)
   * @param identifiers - Optional external identifiers
   */
  bind(
    clientID: number,
    accountID: string | UUIDTypes,
    identifiers?: PlayerSession["identifiers"]
  ): ServerPlayer {
    const session: PlayerSession = {
      clientID,
      accountID,
      identifiers,
      meta: {},
    };

    const player = new ServerPlayer(session);

    this.playersByClient.set(clientID, player);

    return player;
  }

  /**
   * Removes all session data associated with a clientID.
   * Call this from `playerDropped` or logout flows.
   *
   * @param clientID - FiveM player handle
   */
  unbindByClient(clientID: number) {
    const player = this.playersByClient.get(clientID);
    if (!player) return;

    this.playersByClient.delete(clientID);
  }


  /**
   * Returns the ServerPlayer associated with a clientID.
   *
   * @param clientID - FiveM player handle
   */
  getByClient(clientID: number): ServerPlayer | null {
    return this.playersByClient.get(clientID) ?? null;
  }


  /**
   * Returns the domain-level playerId for a FiveM clientID.
   *
   * @param clientID - FiveM player handle
   */
  getPlayerId(clientID: number): string | null {
    const player = this.playersByClient.get(clientID);
    return player?.accountID ?? null;
  }

  /**
   * Stores arbitrary metadata for a client session.
   * This is a convenience wrapper over ServerPlayer.setMeta().
   *
   * @param clientID - FiveM player handle
   * @param key - Metadata key
   * @param value - Metadata value
   */
  setMeta(clientID: number, key: string, value: unknown) {
    const player = this.playersByClient.get(clientID);
    if (!player) return;

    player.setMeta(key, value);
  }

  /**
   * Retrieves metadata previously stored with setMeta().
   *
   * @param clientID - FiveM player handle
   * @param key - Metadata key
   */
  getMeta<T = unknown>(clientID: number, key: string): T | undefined {
    const player = this.playersByClient.get(clientID);
    return player?.getMeta<T>(key);
  }

  /**
   * Returns all currently tracked players.
   */
  getAll(): ServerPlayer[] {
    return Array.from(this.playersByClient.values());
  }
}
