import { type IPlayerInfo } from '../../../adapters'
import type { Vector3 } from '../../../kernel/utils'
import type { LinkedID, PlayerSession } from '../services/core/player.service'

/**
 * Core-level representation of a connected player on the server.
 *
 * This class wraps FiveM natives and session information.
 * It serves as an abstraction layer to interact with the connected client
 * (kicking, teleporting, emitting events) without dealing with raw IDs everywhere.
 *
 * ⚠️ **Design Note:** This class does NOT contain gameplay logic (money, jobs, inventory).
 * Domain logic should live in your modules' services/models (e.g., `EconomyService`, `JobModel`).
 */
export class Player {
  private states = new Set<string>()

  /**
   * Creates a new Player entity instance.
   * This is typically instantiated by the `PlayerService` upon connection.
   *
   * @param session - The internal session data structure holding ID and metadata.
   */
  constructor(
    private readonly session: PlayerSession,
    private readonly playerInfo: IPlayerInfo,
  ) {}

  /**
   * The numeric FiveM Server ID (Source) of the player.
   * Useful for internal logic and array indexing.
   */
  get clientID(): number {
    return this.session.clientID
  }

  /**
   * The FiveM Server ID as a string.
   * Required by most FiveM native functions (e.g., `GetPlayerName`, `DropPlayer`).
   */
  get clientIDStr(): string {
    return this.session.clientID.toString()
  }

  /**
   * The persistent Account ID linked to this session, if the player is authenticated.
   * Returns `undefined` if the player has not logged in yet.
   */
  get accountID(): string | undefined {
    return this.session.accountID?.toString()
  }

  /**
   * The display name of the player (Steam name or FiveM username).
   */
  get name(): string {
    return this.playerInfo.getPlayerName(this.clientID) ?? `Player#${this.clientID}`
  }

  /**
   * Retrieves all platform identifiers associated with the player (steam, license, discord, ip, etc.).
   *
   * @returns An array of identifier strings (e.g., `['steam:11000...', 'license:2332...']`).
   */
  getIdentifiers() {
    const ids: string[] = []
    for (let i = 0; ; i++) {
      const id = GetPlayerIdentifier(this.clientIDStr, i)
      if (!id) break
      ids.push(id)
    }
    return ids
  }

  /**
   * Sends a network event exclusively to this specific player (Client-side).
   * Wrapper for `emitNet` ensuring the correct target Source ID is used.
   *
   * @param eventName - The name of the event to trigger on the client.
   * @param args - Data to send to the client.
   */
  emit(eventName: string, ...args: any[]) {
    emitNet(eventName, this.clientID, ...args)
  }

  /** used to send a private message to the player */
  send(message: string, type: 'chat' | 'error' | 'success' | 'warning' = 'chat') {
    emitNet('core:chat:send', this.clientID, message, type)
  }

  /**
   * Teleports the player to a given position using Server-Side natives.
   *
   * **Note:** This forces the entity position on the server. For smoother gameplay transitions
   * (e.g., inside interiors or across the map), consider using `teleportClient`.
   *
   * @param vector - The target coordinates (x, y, z).
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
   * Requests the Client to teleport itself via the Core Spawner system.
   *
   * This method is preferred for gameplay logic as it allows the client to handle
   * loading screens, fading, and collision loading gracefully.
   *
   * @param vector - The target coordinates (x, y, z).
   */
  teleportClient(vector: Vector3) {
    this.emit('opencore:spawner:teleport', vector)
  }

  spawn(vector: Vector3, model = 'mp_m_freemode_01') {
    this.emit('opencore:spawner:spawn', { position: vector, model })
  }

  /**
   * Disconnects the player from the server.
   *
   * @param reason - The message displayed to the player upon disconnection.
   */
  kick(reason = 'Kicked from server') {
    DropPlayer(this.clientID.toString(), reason)
  }

  /**
   * Sets the routing bucket (virtual world / dimension) for the player.
   * Players in different buckets cannot see or interact with each other.
   *
   * @param bucket - The bucket ID (0 is the default shared world).
   */
  setRoutingBucket(bucket: number) {
    SetPlayerRoutingBucket(this.clientID.toString(), bucket)
  }

  /**
   * Stores arbitrary transient metadata for this player's session.
   * Useful for flags like `isDead`, `isInRaid`, `lastLocation`, etc.
   *
   * @param key - The unique key for the metadata.
   * @param value - The value to store.
   */
  setMeta(key: string, value: unknown) {
    this.session.meta[key] = value
  }

  /**
   * Retrieves metadata previously stored in the session.
   *
   * @template T - The expected type of the value.
   * @param key - The metadata key.
   * @returns The value cast to T, or `undefined` if not set.
   */
  getMeta<T = unknown>(key: string): T | undefined {
    return this.session.meta[key] as T | undefined
  }

  /**
   * Links a persistent Account ID to the current session.
   * Should be called after successful authentication.
   *
   * @param accountID - The unique ID from the database.
   */
  linkAccount(accountID: LinkedID) {
    this.session.accountID = accountID
  }

  /**
   * Checks if the player currently possesses a specific state flag.
   *
   * @param state - The unique string identifier of the state (e.g., 'dead', 'cuffed').
   * @returns `true` if the state is active, `false` otherwise.
   */
  hasState(state: string): boolean {
    return this.states.has(state)
  }

  /**
   * Applies a state flag to the player.
   *
   * @remarks
   * Since states are stored in a `Set`, adding an existing state has no effect (idempotent).
   * Ideally, this should trigger a sync event to the client if needed.
   *
   * @param state - The state key to add.
   */
  addState(state: string): void {
    this.states.add(state)
    // this.emit('core:state:add', state) // ? optional !!
  }

  /**
   * Removes a specific state flag from the player.
   *
   * @param state - The state key to remove.
   */
  removeState(state: string): void {
    this.states.delete(state)
    // this.emit('core:state:remove', state) // ? optional !!
  }

  /**
   * Toggles the presence of a state flag.
   *
   * @param state - The state key to toggle.
   * @param force - If provided, forces the state to be added (`true`) or removed (`false`) regardless of its current status.
   *
   * @returns The final status of the state (`true` if active, `false` if inactive).
   *
   * @example
   * ```ts
   * // Standard toggle
   * player.toggleState('duty'); // turns on if off, off if on
   *
   * // Force enable (equivalent to addState but returns boolean)
   * player.toggleState('duty', true); // always results in true
   * ```
   */
  toggleState(state: string, force?: boolean): boolean {
    if (force !== undefined) {
      force ? this.addState(state) : this.removeState(state)
      return force
    }

    if (this.hasState(state)) {
      this.removeState(state)
      return false
    } else {
      this.addState(state)
      return true
    }
  }

  /**
   * Retrieves a snapshot of all currently active state flags for this player.
   *
   * @returns An array containing all active state keys.
   */
  getStates(): string[] {
    return Array.from(this.states)
  }
}
