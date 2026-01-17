import { Vector3 } from '../../../kernel/utils/vector3'

interface PlayerSessionMeta {
  playerId?: string
  [key: string]: unknown
}

/**
 * Client-side player representation with convenient accessors and methods.
 */
class Player {
  private meta: PlayerSessionMeta = {}

  // ─────────────────────────────────────────────────────────────────────────────
  // Core Getters
  // ─────────────────────────────────────────────────────────────────────────────

  /** Get the player's ped handle */
  get ped(): number {
    return PlayerPedId()
  }

  /** Get the player ID */
  get id(): number {
    return PlayerId()
  }

  /** Get the server ID (source) */
  get serverId(): number {
    return GetPlayerServerId(this.id)
  }

  /** Get the player's current coordinates */
  get coords(): Vector3 {
    const [x, y, z] = GetEntityCoords(this.ped, false)
    return { x, y, z }
  }

  /** Get the player's current heading (rotation) */
  get heading(): number {
    return GetEntityHeading(this.ped)
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Health & Status
  // ─────────────────────────────────────────────────────────────────────────────

  /** Get current health (0-200, 100 = dead) */
  get health(): number {
    return GetEntityHealth(this.ped)
  }

  /** Get max health */
  get maxHealth(): number {
    return GetEntityMaxHealth(this.ped)
  }

  /** Get current armor (0-100) */
  get armor(): number {
    return GetPedArmour(this.ped)
  }

  /** Check if the player is dead */
  get isDead(): boolean {
    return IsEntityDead(this.ped)
  }

  /** Check if player is in water */
  get isInWater(): boolean {
    return IsEntityInWater(this.ped)
  }

  /** Check if player is swimming */
  get isSwimming(): boolean {
    return IsPedSwimming(this.ped)
  }

  /** Check if player is falling */
  get isFalling(): boolean {
    return IsPedFalling(this.ped)
  }

  /** Check if player is climbing */
  get isClimbing(): boolean {
    return IsPedClimbing(this.ped)
  }

  /** Check if player is ragdolling */
  get isRagdoll(): boolean {
    return IsPedRagdoll(this.ped)
  }

  /** Check if player is parachuting */
  get isParachuting(): boolean {
    return IsPedInParachuteFreeFall(this.ped)
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Vehicle State
  // ─────────────────────────────────────────────────────────────────────────────

  /** Check if player is in any vehicle */
  get isInVehicle(): boolean {
    return IsPedInAnyVehicle(this.ped, false)
  }

  /** Get current vehicle handle (or null if not in vehicle) */
  get currentVehicle(): number | null {
    if (!this.isInVehicle) return null
    return GetVehiclePedIsIn(this.ped, false)
  }

  /** Get last vehicle the player was in */
  get lastVehicle(): number | null {
    const vehicle = GetVehiclePedIsIn(this.ped, true)
    return vehicle !== 0 ? vehicle : null
  }

  /** Check if player is the driver of current vehicle */
  get isDriver(): boolean {
    const vehicle = this.currentVehicle
    if (!vehicle) return false
    return GetPedInVehicleSeat(vehicle, -1) === this.ped
  }

  /** Get current vehicle seat index (-1 = driver, 0+ = passengers) */
  get vehicleSeat(): number | null {
    const vehicle = this.currentVehicle
    if (!vehicle) return null

    for (let seat = -1; seat < GetVehicleMaxNumberOfPassengers(vehicle); seat++) {
      if (GetPedInVehicleSeat(vehicle, seat) === this.ped) {
        return seat
      }
    }
    return null
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Combat State
  // ─────────────────────────────────────────────────────────────────────────────

  /** Check if player is shooting */
  get isShooting(): boolean {
    return IsPedShooting(this.ped)
  }

  /** Check if player is aiming */
  get isAiming(): boolean {
    return IsPlayerFreeAiming(this.id)
  }

  /** Check if player is reloading */
  get isReloading(): boolean {
    return IsPedReloading(this.ped)
  }

  /** Check if player is in cover */
  get isInCover(): boolean {
    return IsPedInCover(this.ped, false)
  }

  /** Check if player is in melee combat */
  get isInMeleeCombat(): boolean {
    return IsPedInMeleeCombat(this.ped)
  }

  /** Get currently equipped weapon hash */
  get currentWeapon(): number {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const [_, weaponHash] = GetCurrentPedWeapon(this.ped, true)
    return weaponHash
  }

  /** Get ammo count for current weapon */
  get currentWeaponAmmo(): number {
    return GetAmmoInPedWeapon(this.ped, this.currentWeapon)
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Movement State
  // ─────────────────────────────────────────────────────────────────────────────

  /** Check if player is walking */
  get isWalking(): boolean {
    return IsPedWalking(this.ped)
  }

  /** Check if player is running */
  get isRunning(): boolean {
    return IsPedRunning(this.ped)
  }

  /** Check if player is sprinting */
  get isSprinting(): boolean {
    return IsPedSprinting(this.ped)
  }

  /** Check if player is on foot */
  get isOnFoot(): boolean {
    return IsPedOnFoot(this.ped)
  }

  /** Check if player is stationary */
  get isStill(): boolean {
    return IsPedStill(this.ped)
  }

  /** Get movement speed in m/s */
  get speed(): number {
    return GetEntitySpeed(this.ped)
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Health & Armor Setters
  // ─────────────────────────────────────────────────────────────────────────────

  /**
   * Set player health.
   * @param value - Health value (100 = dead, 200 = full)
   */
  setHealth(value: number): void {
    SetEntityHealth(this.ped, value)
  }

  /**
   * Set player armor.
   * @param value - Armor value (0-100)
   */
  setArmor(value: number): void {
    SetPedArmour(this.ped, Math.max(0, Math.min(100, value)))
  }

  /**
   * Heal the player to full health and armor.
   */
  heal(): void {
    this.setHealth(this.maxHealth)
    this.setArmor(100)
  }

  /**
   * Revive the player at current position.
   */
  revive(): void {
    const coords = this.coords
    NetworkResurrectLocalPlayer(coords.x, coords.y, coords.z, this.heading, 1, false)
    this.heal()
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Position & Movement
  // ─────────────────────────────────────────────────────────────────────────────

  /**
   * Set player coordinates.
   * @param vector3 - Target position
   * @param heading - Optional heading
   */
  setCoords(vector3: Vector3, heading?: number): void {
    SetEntityCoordsNoOffset(this.ped, vector3.x, vector3.y, vector3.z, false, false, false)
    if (heading !== undefined) {
      SetEntityHeading(this.ped, heading)
    }
  }

  /**
   * Set player heading/rotation.
   * @param heading - Heading in degrees
   */
  setHeading(heading: number): void {
    SetEntityHeading(this.ped, heading)
  }

  /**
   * Freeze/unfreeze the player in place.
   * @param freeze - Whether to freeze
   */
  freeze(freeze: boolean): void {
    FreezeEntityPosition(this.ped, freeze)
  }

  /**
   * Set player invincibility.
   * @param invincible - Whether invincible
   */
  setInvincible(invincible: boolean): void {
    SetEntityInvincible(this.ped, invincible)
  }

  /**
   * Set player visibility.
   * @param visible - Whether visible
   */
  setVisible(visible: boolean): void {
    SetEntityVisible(this.ped, visible, false)
  }

  /**
   * Set player alpha/transparency.
   * @param alpha - Alpha value (0-255)
   */
  setAlpha(alpha: number): void {
    SetEntityAlpha(this.ped, alpha, false)
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Weapons
  // ─────────────────────────────────────────────────────────────────────────────

  /**
   * Give a weapon to the player.
   * @param weapon - Weapon name (e.g., 'WEAPON_PISTOL')
   * @param ammo - Ammo count
   * @param equipNow - Whether to equip immediately
   */
  giveWeapon(weapon: string, ammo = 100, equipNow = true): void {
    const weaponHash = GetHashKey(weapon)
    GiveWeaponToPed(this.ped, weaponHash, ammo, false, equipNow)
  }

  /**
   * Remove a weapon from the player.
   * @param weapon - Weapon name
   */
  removeWeapon(weapon: string): void {
    const weaponHash = GetHashKey(weapon)
    RemoveWeaponFromPed(this.ped, weaponHash)
  }

  /**
   * Remove all weapons from the player.
   */
  removeAllWeapons(): void {
    RemoveAllPedWeapons(this.ped, true)
  }

  /**
   * Set current weapon ammo.
   * @param weapon - Weapon name
   * @param ammo - Ammo count
   */
  setWeaponAmmo(weapon: string, ammo: number): void {
    const weaponHash = GetHashKey(weapon)
    SetPedAmmo(this.ped, weaponHash, ammo)
  }

  /**
   * Check if player has a specific weapon.
   * @param weapon - Weapon name
   */
  hasWeapon(weapon: string): boolean {
    const weaponHash = GetHashKey(weapon)
    return HasPedGotWeapon(this.ped, weaponHash, false)
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Animations & Tasks
  // ─────────────────────────────────────────────────────────────────────────────

  /**
   * Play an animation on the player.
   * @param dict - Animation dictionary
   * @param name - Animation name
   * @param duration - Duration (-1 for looped)
   * @param flags - Animation flags
   */
  async playAnimation(dict: string, name: string, duration = -1, flags = 1): Promise<void> {
    RequestAnimDict(dict)
    while (!HasAnimDictLoaded(dict)) {
      await new Promise((r) => setTimeout(r, 0))
    }

    TaskPlayAnim(this.ped, dict, name, 8.0, -8.0, duration, flags, 0.0, false, false, false)
  }

  /**
   * Stop current animation.
   */
  stopAnimation(): void {
    ClearPedTasks(this.ped)
  }

  /**
   * Stop animation immediately.
   */
  stopAnimationImmediately(): void {
    ClearPedTasksImmediately(this.ped)
  }

  /**
   * Check if player is playing a specific animation.
   * @param dict - Animation dictionary
   * @param name - Animation name
   */
  isPlayingAnimation(dict: string, name: string): boolean {
    return IsEntityPlayingAnim(this.ped, dict, name, 3)
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Vehicle Interaction
  // ─────────────────────────────────────────────────────────────────────────────

  /**
   * Warp player into a vehicle.
   * @param vehicle - Vehicle handle
   * @param seat - Seat index (-1 = driver)
   */
  warpIntoVehicle(vehicle: number, seat = -1): void {
    TaskWarpPedIntoVehicle(this.ped, vehicle, seat)
  }

  /**
   * Task player to exit current vehicle.
   * @param flags - Exit flags (0 = normal, 16 = immediately)
   */
  exitVehicle(flags = 0): void {
    const vehicle = this.currentVehicle
    if (vehicle) {
      TaskLeaveVehicle(this.ped, vehicle, flags)
    }
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Ped Flags & Properties
  // ─────────────────────────────────────────────────────────────────────────────

  /**
   * Set can ragdoll.
   * @param canRagdoll - Whether player can ragdoll
   */
  setCanRagdoll(canRagdoll: boolean): void {
    SetPedCanRagdoll(this.ped, canRagdoll)
  }

  /**
   * Set ped config flag.
   * @param flag - Flag ID
   * @param value - Flag value
   */
  setConfigFlag(flag: number, value: boolean): void {
    SetPedConfigFlag(this.ped, flag, value)
  }

  /**
   * Get ped config flag.
   * @param flag - Flag ID
   */
  getConfigFlag(flag: number): boolean {
    return GetPedConfigFlag(this.ped, flag, true)
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Meta Storage
  // ─────────────────────────────────────────────────────────────────────────────

  /**
   * Set a metadata value.
   * @param key - Meta key
   * @param value - Meta value
   */
  setMeta(key: string, value: unknown): void {
    this.meta[key] = value
  }

  /**
   * Get a metadata value.
   * @param key - Meta key
   */
  getMeta<T = unknown>(key: string): T | undefined {
    return this.meta[key] as T | undefined
  }

  /**
   * Delete a metadata value.
   * @param key - Meta key
   */
  deleteMeta(key: string): void {
    delete this.meta[key]
  }

  /**
   * Get all metadata.
   */
  getAllMeta(): PlayerSessionMeta {
    return { ...this.meta }
  }

  /**
   * Clear all metadata.
   */
  clearMeta(): void {
    this.meta = {}
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Utility Methods
  // ─────────────────────────────────────────────────────────────────────────────

  /**
   * Get distance to a position.
   * @param position - Target position
   */
  distanceTo(position: Vector3): number {
    const coords = this.coords
    return Math.sqrt(
      (coords.x - position.x) ** 2 + (coords.y - position.y) ** 2 + (coords.z - position.z) ** 2,
    )
  }

  /**
   * Check if player is within range of a position.
   * @param position - Target position
   * @param range - Maximum range
   */
  isNearPosition(position: Vector3, range: number): boolean {
    return this.distanceTo(position) <= range
  }

  /**
   * Get the entity the player is looking at.
   * @param maxDistance - Maximum detection distance
   */
  getEntityLookingAt(maxDistance = 10.0): number | null {
    const [hit, entity] = GetEntityPlayerIsFreeAimingAt(this.id)
    if (!hit || !entity || entity === 0) return null

    const coords = this.coords
    const entityCoords = GetEntityCoords(entity, true)
    const distance = Math.sqrt(
      (coords.x - entityCoords[0]) ** 2 +
        (coords.y - entityCoords[1]) ** 2 +
        (coords.z - entityCoords[2]) ** 2,
    )

    return distance <= maxDistance ? entity : null
  }

  /**
   * Disable a control action.
   * @param control - Control ID
   * @param padIndex - Pad index (usually 0)
   */
  disableControl(control: number, padIndex = 0): void {
    DisableControlAction(padIndex, control, true)
  }

  /**
   * Check if a control is pressed.
   * @param control - Control ID
   * @param padIndex - Pad index (usually 0)
   */
  isControlPressed(control: number, padIndex = 0): boolean {
    return IsControlPressed(padIndex, control)
  }

  /**
   * Check if a control was just pressed.
   * @param control - Control ID
   * @param padIndex - Pad index (usually 0)
   */
  isControlJustPressed(control: number, padIndex = 0): boolean {
    return IsControlJustPressed(padIndex, control)
  }
}

export const ClientPlayer = new Player()
