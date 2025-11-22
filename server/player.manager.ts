import { injectable } from "tsyringe";
import { UUIDTypes } from "uuid";

/**
 * Represents a lightweight player session tracked by the Core.
 * This structure contains only session-related data and is not part
 * of the gameplay domain (e.g. money, inventory, jobs).
 */
export interface PlayerSession {
  /** FiveM client ID associated with this session */
  clientID: number;

  /** Logical playerId created by your domain (UUID/string) */
  playerId: string | UUIDTypes;

  /** Optional external identifiers (license, steam, discord, etc.) */
  identifiers?: {
    license?: string;
    steam?: string;
    discord?: string;
  };

  /** Small bag for storing metadata during the session */
  meta?: Record<string, unknown>;
}

/**
 * Core-level session manager.
 *
 * Tracks clientID ↔ playerId associations and exposes a small API
 * for retrieving sessions and storing metadata. Does not contain
 * gameplay logic or PlayerEntity.
 */
@injectable()
export class PlayerManager {
  /** Maps FiveM clientID → PlayerSession */
  private sessionsByClient = new Map<number, PlayerSession>();

  /** Maps logical playerId → PlayerSession */
  private sessionsByPlayerId = new Map<string, PlayerSession>();

  /**
   * Binds a FiveM clientID to a domain-level playerId.
   * Usually called after a successful login.
   *
   * @param clientID - FiveM player handle
   * @param playerId - Domain player identifier
   * @param identifiers - Optional external identifiers
   */
  bind(
    clientID: number,
    playerId: string,
    identifiers?: PlayerSession["identifiers"]
  ) {
    const session: PlayerSession = {
      clientID,
      playerId,
      identifiers,
      meta: {},
    };

    this.sessionsByClient.set(clientID, session);
    this.sessionsByPlayerId.set(playerId, session);
  }

  /**
   * Removes all session data associated with a clientID.
   * Call this from `playerDropped` or logout flows.
   *
   * @param clientID - FiveM player handle
   */
  unbindByClient(clientID: number) {
    const session = this.sessionsByClient.get(clientID);
    if (!session) return;

    this.sessionsByClient.delete(clientID);
    this.sessionsByPlayerId.delete(session.playerId.toString());
  }

  /**
   * Returns the session associated with a clientID.
   *
   * @param clientID - FiveM player handle
   */
  getSessionByClient(clientID: number): PlayerSession | null {
    return this.sessionsByClient.get(clientID) ?? null;
  }

  /**
   * Returns the session associated with a playerId.
   *
   * @param playerId - Domain player identifier
   */
  getSessionByPlayerId(playerId: string): PlayerSession | null {
    return this.sessionsByPlayerId.get(playerId) ?? null;
  }

  /**
   * Returns the domain-level playerId for a FiveM clientID.
   *
   * @param clientID - FiveM player handle
   */
  getPlayerId(clientID: number): string | null {
    const session = this.sessionsByClient.get(clientID);
    return session?.playerId.toString() ?? null;
  }

  /**
   * Stores arbitrary metadata for a client session.
   *
   * @param clientID - FiveM player handle
   * @param key - Metadata key
   * @param value - Metadata value
   */
  setMeta(clientID: number, key: string, value: unknown) {
    const session = this.sessionsByClient.get(clientID);
    if (!session) return;

    if (!session.meta) session.meta = {};
    session.meta[key] = value;
  }

  /**
   * Retrieves metadata previously stored with setMeta().
   *
   * @param clientID - FiveM player handle
   * @param key - Metadata key
   */
  getMeta<T = unknown>(clientID: number, key: string): T | undefined {
    const session = this.sessionsByClient.get(clientID);
    return session?.meta?.[key] as T | undefined;
  }
}
