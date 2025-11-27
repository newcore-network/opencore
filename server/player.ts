import type { UUIDTypes } from 'uuid';

export type PlayerId = string | UUIDTypes;

/**
 * Represents a lightweight player session tracked by the Core.
 * This structure contains only session-related data and is not part
 * of the gameplay domain (e.g. money, inventory, jobs).
 */
export interface PlayerSession {
  /** FiveM client ID associated with this session */
  clientID: number;

  /** Logical playerId created by your domain (UUID/string) */
  accountID: PlayerId;

  /** Optional external identifiers (license, steam, discord, etc.) */
  identifiers?: {
    license?: string;
    steam?: string;
    discord?: string;
  };

  /** Small bag for storing metadata during the session */
  meta: Record<string, unknown>;
}

/**
 * Core-level representation of a connected player on the server.
 *
 * This class wraps FiveM natives and session information, but it
 * does NOT contain gameplay logic (no money, jobs, inventory, etc.).
 * Domain logic should live in your modules' services/models.
 */
export class ServerPlayer {
  constructor(private readonly session: PlayerSession) {}

  get clientID(): number {
    return this.session.clientID;
  }
  get clientIDStr(): string {
    return this.session.clientID.toString();
  }

  get accountID(): string {
    return this.session.accountID.toString();
  }

  get name(): string {
    return GetPlayerName(this.clientIDStr);
  }

  getIdentifiers() {
    const ids: string[] = [];
    for (let i = 0; ; i++) {
      const id = GetPlayerIdentifier(this.clientIDStr, i);
      if (!id) break;
      ids.push(id);
    }
    return ids;
  }

  emit(eventName: string, ...args: any[]) {
    emitNet(eventName, this.clientID, ...args);
  }

  kick(reason = 'Kicked from server') {
    DropPlayer(this.clientID.toString(), reason);
  }

  setRoutingBucket(bucket: number) {
    SetPlayerRoutingBucket(this.clientID.toString(), bucket);
  }

  setMeta(key: string, value: unknown) {
    this.session.meta[key] = value;
  }

  getMeta<T = unknown>(key: string): T | undefined {
    return this.session.meta[key] as T | undefined;
  }
}
