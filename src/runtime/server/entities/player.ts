import { IPlayerInfo } from '../../../adapters'
import { INetTransport } from '../../../adapters/contracts/INetTransport'
import { IEntityServer } from '../../../adapters/contracts/server/IEntityServer'
import { IPlayerServer } from '../../../adapters/contracts/server/IPlayerServer'
import type { PlayerIdentifier } from '../../../adapters/contracts/types/identifier'
import { Vector3 } from '../../../kernel/utils/vector3'
import { BaseEntity } from '../../core/entity'
import { Spatial } from '../../core/spatial'
import { LinkedID } from '../types/linked-id'
import { PlayerSession } from '../types/player-session.types'
import { SerializedPlayerData } from '../types/core-exports.types'

/**
 * Adapter bundle for player operations.
 * Passed to Player instances by PlayerDirectory.
 */
export interface PlayerAdapters {
  playerInfo: IPlayerInfo
  playerServer: IPlayerServer
  entityServer: IEntityServer
  netTransport: INetTransport
}

/**
 * Core-level representation of a connected player on the server.
 *
 * @remarks
 * This class wraps platform natives and session information.
 * It serves as an abstraction layer to interact with the connected client
 * (kicking, teleporting, emitting events) without dealing with raw IDs everywhere.
 *
 * **Design Note:** This class does NOT contain gameplay logic (money, jobs, inventory).
 * Domain logic should live in your modules' services/models (e.g., `EconomyService`, `JobModel`).
 *
 * This class is platform-agnostic and works across different game engines
 * (FiveM, RageMP, alt:V, etc.) through the adapter pattern.
 */
export class Player extends BaseEntity implements Spatial {
  private position: Vector3

  /**
   * Creates a new Player entity instance.
   * This is typically instantiated by the `PlayerService` upon connection.
   *
   * @param session - The internal session data structure holding ID and metadata.
   * @param adapters - Platform adapters for player operations.
   */
  constructor(
    private readonly session: PlayerSession,
    private readonly adapters: PlayerAdapters,
  ) {
    super(`player:${session.clientID}`)
    this.position = adapters.playerInfo.getPlayerPosition(session.clientID)
  }

  /**
   * The numeric client/server ID of the player.
   * This is the platform-specific player identifier used for native calls.
   */
  get clientID(): number {
    return this.session.clientID
  }

  /**
   * The persistent Account ID linked to this session, if the player is authenticated.
   * Returns `undefined` if the player has not logged in yet.
   */
  get accountID(): string | undefined {
    return this.session.accountID?.toString()
  }

  /**
   * The display name of the player.
   */
  get name(): string {
    return this.adapters.playerInfo.getPlayerName(this.clientID) ?? `Player#${this.clientID}`
  }

  // ─────────────────────────────────────────────────────────────────
  // Position / Spatial
  // ─────────────────────────────────────────────────────────────────

  getPosition(): Vector3 {
    this.position = this.adapters.playerInfo.getPlayerPosition(this.clientID)
    return this.position
  }

  /**
   * Sets the player position using the platform-agnostic API.
   *
   * @param vector - The target coordinates (x, y, z).
   */
  setPosition(vector: Vector3): void {
    const ped = this.adapters.playerServer.getPed(this.clientID.toString())
    this.adapters.entityServer.setPosition(ped, vector, { clearArea: true })
  }

  // ─────────────────────────────────────────────────────────────────
  // Identifiers
  // ─────────────────────────────────────────────────────────────────

  /**
   * Retrieves all platform identifiers associated with the player.
   *
   * @deprecated Use getPlayerIdentifiers() for structured identifier data.
   * @returns An array of identifier strings (e.g., `['steam:11000...', 'license:2332...']`).
   */
  getIdentifiers(): string[] {
    return this.adapters.playerServer.getIdentifiers(this.clientID.toString())
  }

  /**
   * Retrieves all identifiers as structured objects.
   *
   * @returns An array of PlayerIdentifier objects with type, value, and raw fields.
   */
  getPlayerIdentifiers(): PlayerIdentifier[] {
    return this.adapters.playerServer.getPlayerIdentifiers(this.clientID.toString())
  }

  /**
   * Gets a specific identifier by type.
   *
   * @param identifierType - The type of identifier (e.g., 'steam', 'license', 'discord')
   * @returns The identifier string or undefined if not found
   */
  getIdentifier(identifierType: string): string | undefined {
    return this.adapters.playerServer.getIdentifier(this.clientID.toString(), identifierType)
  }

  /**
   * Gets the player's license identifier.
   * @deprecated Use getIdentifier('license') for cross-platform compatibility.
   */
  getLicense(): string | undefined {
    return this.getIdentifier('license')
  }

  // ─────────────────────────────────────────────────────────────────
  // Network Communication
  // ─────────────────────────────────────────────────────────────────

  /**
   * Sends a network event exclusively to this specific player (client-side).
   *
   * @param eventName - The name of the event to trigger on the client.
   * @param args - Data to send to the client.
   */
  emit(eventName: string, ...args: any[]): void {
    this.adapters.netTransport.emitNet(eventName, this.clientID, ...args)
  }

  /**
   * Sends a private message to the player.
   *
   * @param message - The message text
   * @param type - Message type for styling
   */
  send(message: string, type: 'chat' | 'error' | 'success' | 'warning' = 'chat'): void {
    this.emit('core:chat:send', message, type)
  }

  // ─────────────────────────────────────────────────────────────────
  // Spawning / Teleporting
  // ─────────────────────────────────────────────────────────────────

  /**
   * Requests the client to teleport via the spawner system.
   *
   * @remarks
   * This method is preferred for gameplay logic as it allows the client to handle
   * loading screens, fading, and collision loading gracefully.
   *
   * @param vector - The target coordinates (x, y, z).
   */
  teleport(vector: Vector3): void {
    this.emit('opencore:spawner:teleport', vector)
  }

  /**
   * Spawns the player at a position with a specific model.
   *
   * @param vector - The spawn coordinates
   * @param model - The ped model to use (default: 'mp_m_freemode_01')
   */
  spawn(vector: Vector3, model = 'mp_m_freemode_01'): void {
    this.emit('opencore:spawner:spawn', { position: vector, model })
  }

  // ─────────────────────────────────────────────────────────────────
  // Connection Management
  // ─────────────────────────────────────────────────────────────────

  /**
   * Disconnects the player from the server.
   *
   * @param reason - The message displayed to the player upon disconnection.
   */
  kick(reason = 'Kicked from server'): void {
    this.adapters.playerServer.drop(this.clientID.toString(), reason)
  }

  // ─────────────────────────────────────────────────────────────────
  // Dimension / Routing Bucket
  // ─────────────────────────────────────────────────────────────────

  /**
   * Sets the routing bucket (virtual world/dimension) for the player.
   * Players in different buckets cannot see or interact with each other.
   *
   * @param bucket - The bucket ID (0 is the default shared world).
   */
  setRoutingBucket(bucket: number): void {
    this.adapters.playerServer.setRoutingBucket(this.clientID.toString(), bucket)
    this._dimension = bucket
  }

  /**
   * Gets the current routing bucket.
   */
  getRoutingBucket(): number {
    return this.adapters.playerServer.getRoutingBucket(this.clientID.toString())
  }

  /**
   * Sets the player dimension (alias for setRoutingBucket).
   */
  override set dimension(value: number) {
    this.setRoutingBucket(value)
  }

  /**
   * Gets the player dimension (alias for getRoutingBucket).
   */
  override get dimension(): number {
    return this.getRoutingBucket()
  }

  // ─────────────────────────────────────────────────────────────────
  // Session Metadata (Transient)
  // ─────────────────────────────────────────────────────────────────

  /**
   * Stores arbitrary transient metadata for this player's session.
   * Useful for flags like `isDead`, `isInRaid`, `lastLocation`, etc.
   *
   * @param key - The unique key for the metadata.
   * @param value - The value to store.
   */
  override setMeta<T = unknown>(key: string, value: T): void {
    this.session.meta[key] = value
  }

  /**
   * Retrieves metadata previously stored in the session.
   *
   * @param key - The metadata key.
   * @returns The value cast to T, or `undefined` if not set.
   */
  override getMeta<T = unknown>(key: string): T | undefined {
    return this.session.meta[key] as T | undefined
  }

  // ─────────────────────────────────────────────────────────────────
  // Account Linking
  // ─────────────────────────────────────────────────────────────────

  /**
   * Links a persistent Account ID to the current session.
   * Should be called after successful authentication.
   *
   * @param accountID - The unique ID from the persistent storage.
   */
  linkAccount(accountID: LinkedID): void {
    this.session.accountID = accountID
  }

  /**
   * Unlinks the account from the current session.
   */
  unlinkAccount(): void {
    this.session.accountID = undefined
  }

  // ─────────────────────────────────────────────────────────────────
  // State Flags
  // ─────────────────────────────────────────────────────────────────

  /**
   * Checks if the player currently possesses a specific state flag.
   *
   * @param state - The unique string identifier of the state (e.g., 'dead', 'cuffed').
   */
  hasState(state: string): boolean {
    return super.has(state)
  }

  /**
   * Applies a state flag to the player.
   *
   * @param state - The state key to add.
   */
  addState(state: string): void {
    super.add(state)
  }

  /**
   * Removes a specific state flag from the player.
   *
   * @param state - The state key to remove.
   */
  removeState(state: string): void {
    super.delete(state)
  }

  /**
   * Toggles the presence of a state flag.
   *
   * @param state - The state key to toggle.
   * @param force - If provided, forces the state to be added or removed.
   * @returns The final status of the state.
   */
  toggleState(state: string, force?: boolean): boolean {
    return super.toggle(state, force)
  }

  /**
   * Retrieves all currently active state flags.
   */
  getStates(): string[] {
    return super.all()
  }

  // ─────────────────────────────────────────────────────────────────
  // Health & Armor
  // ─────────────────────────────────────────────────────────────────

  /**
   * Gets the current health of the player's ped.
   */
  getHealth(): number {
    const ped = this.adapters.playerServer.getPed(this.clientID.toString())
    return this.adapters.entityServer.getHealth(ped)
  }

  /**
   * Sets the health of the player's ped.
   *
   * @param health - Health value to set (platform-specific range).
   */
  setHealth(health: number): void {
    const ped = this.adapters.playerServer.getPed(this.clientID.toString())
    this.adapters.entityServer.setHealth(ped, health)
  }

  /**
   * Gets the current armor of the player's ped.
   */
  getArmor(): number {
    const ped = this.adapters.playerServer.getPed(this.clientID.toString())
    return this.adapters.entityServer.getArmor(ped)
  }

  /**
   * Sets the armor of the player's ped.
   *
   * @param armor - Armor value to set (typically 0-100).
   */
  setArmor(armor: number): void {
    const ped = this.adapters.playerServer.getPed(this.clientID.toString())
    this.adapters.entityServer.setArmor(ped, armor)
  }

  /**
   * Kills the player by setting health to 0.
   */
  kill(): void {
    this.setHealth(0)
  }

  /**
   * Checks if the player is alive.
   *
   * @remarks
   * The threshold (100) is platform-specific. In GTA V-based platforms,
   * health below 100 means dead.
   */
  isAlive(): boolean {
    return this.getHealth() > 100
  }

  // ─────────────────────────────────────────────────────────────────
  // Serialization
  // ─────────────────────────────────────────────────────────────────

  /**
   * Serializes the player data for cross-resource transfer.
   *
   * @returns Serialized player data DTO
   */
  serialize(): SerializedPlayerData {
    return {
      clientID: this.clientID,
      accountID: this.accountID,
      identifiers: this.session.identifiers,
      meta: { ...this.session.meta },
      states: this.getStates(),
    }
  }
}
