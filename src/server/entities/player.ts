import type { Vector3 } from '../../utils'
import type { playerID, PlayerSession } from '../services/player'

/**
 * Core-level representation of a connected player on the server.
 *
 * This class wraps FiveM natives and session information, but it
 * does NOT contain gameplay logic (no money, jobs, inventory, etc.).
 * Domain logic should live in your modules' services/models.
 */
export class Player {
  constructor(private readonly session: PlayerSession) {}

  get clientID(): number {
    return this.session.clientID
  }
  get clientIDStr(): string {
    return this.session.clientID.toString()
  }

  get accountID(): string | undefined {
    return this.session.accountID?.toString()
  }

  get name(): string {
    return GetPlayerName(this.clientIDStr)
  }

  getIdentifiers() {
    const ids: string[] = []
    for (let i = 0; ; i++) {
      const id = GetPlayerIdentifier(this.clientIDStr, i)
      if (!id) break
      ids.push(id)
    }
    return ids
  }

  emit(eventName: string, ...args: any[]) {
    emitNet(eventName, this.clientID, ...args)
  }

  /**
   * Teleports the player to a given position. Server-side.
   * @param vector x, y, z
   */
  teleport(vector: Vector3) {
    SetEntityCoords(
      GetPlayerPed(this.clientIDStr),
      vector.x,
      vector.y,
      vector.z,
      false,
      false,
      false,
      true,
    )
  }

  /**
   * Teleports the player using the core spawner system. Client-side.
   * @param vector
   */
  teleportClient(vector: Vector3) {
    this.emit('core:spawner:teleport', vector)
  }

  kick(reason = 'Kicked from server') {
    DropPlayer(this.clientID.toString(), reason)
  }

  setRoutingBucket(bucket: number) {
    SetPlayerRoutingBucket(this.clientID.toString(), bucket)
  }

  setMeta(key: string, value: unknown) {
    this.session.meta[key] = value
  }

  getMeta<T = unknown>(key: string): T | undefined {
    return this.session.meta[key] as T | undefined
  }

  linkAccount(accountID: playerID) {
    this.session.accountID = accountID
  }
}
