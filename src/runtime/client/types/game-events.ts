/**
 * Game Events - low-level events captured by CitizenFX runtimes
 *
 * Documentation: https://docs.fivem.net/docs/game-references/game-events/
 *
 * These are low-level events from the RAGE engine. The arguments are
 * passed as arrays from the native layer.
 *
 * Note: this list is GTA5-oriented and may differ on RedM (rdr3).
 */
// ─────────────────────────────────────────────────────────────────────────────
// Event Names (string literals for type safety)
// ─────────────────────────────────────────────────────────────────────────────
export type GameEventName =
  // Damage Events
  | 'CEventNetworkEntityDamage'
  // Vehicle Events
  | 'CEventNetworkPlayerEnteredVehicle'
  | 'CEventNetworkPlayerLeftVehicle'
  | 'CEventNetworkVehicleUndrivable'
  // Player Events
  | 'CEventNetworkPlayerSpawn'
  | 'CEventNetworkPlayerCollectedPickup'
  | 'CEventNetworkPlayerCollectedAmbientPickup'
  // Ped Events
  | 'CEventShockingSeenPedKilled'
  | 'CEventShockingWeaponThreat'
  | 'CEventShockingGunshotFired'
  | 'CEventShockingExplosion'
  // Weapon Events
  | 'CEventGunShot'
  | 'CEventGunShotWhizzedBy'
  | 'CEventExplosionHeard'
  // AI Events
  | 'CEventShockingCarCrash'
  | 'CEventShockingBicycleCrash'
  | 'CEventShockingSeenCarStolen'
  // Generic fallback
  | (string & {})

// ─────────────────────────────────────────────────────────────────────────────
// Parsed Event Data Types
// ─────────────────────────────────────────────────────────────────────────────

/**
 * CEventNetworkEntityDamage
 * Fired when any networked entity takes damage
 */
export interface EntityDamageEvent {
  /** Entity that was damaged */
  victim: number
  /** Entity that caused the damage (0 if none) */
  attacker: number
  /** Unknown parameter */
  arg2: number
  /** Unknown parameter */
  arg3: number
  /** Unknown parameter */
  arg4: number
  /** Whether the victim died from this damage */
  victimDied: boolean
  /** Weapon hash used */
  weaponHash: number
  /** Unknown parameter */
  arg7: number
  /** Unknown parameter */
  arg8: number
  /** Unknown parameter - possibly damage amount related */
  arg9: number
}

/**
 * CEventNetworkPlayerEnteredVehicle
 * Fired when a player enters a vehicle
 */
export interface PlayerEnteredVehicleEvent {
  /** Player that entered */
  player: number
  /** Vehicle entered */
  vehicle: number
}

/**
 * CEventNetworkPlayerLeftVehicle
 * Fired when a player leaves a vehicle
 */
export interface PlayerLeftVehicleEvent {
  /** Player that left */
  player: number
  /** Vehicle left */
  vehicle: number
}

/**
 * CEventShockingSeenPedKilled
 * Fired when a ped witnesses another ped being killed
 */
export interface SeenPedKilledEvent {
  /** Ped that witnessed the death */
  witness: number
  /** Ped that was killed */
  victim: number
}

/**
 * CEventGunShot
 * Fired when a weapon is fired
 */
export interface GunShotEvent {
  /** Entity that fired */
  shooter: number
  /** Target coordinates */
  coords: { x: number; y: number; z: number }
}

/**
 * CEventNetworkVehicleUndrivable
 * Fired when a vehicle becomes undrivable (destroyed)
 */
export interface VehicleUndrivableEvent {
  /** Vehicle that became undrivable */
  vehicle: number
  /** Entity responsible (if any) */
  attacker: number
  /** Weapon hash that caused it */
  weaponHash: number
}

// ─────────────────────────────────────────────────────────────────────────────
// Event Parsers - Convert raw args to typed objects
// ─────────────────────────────────────────────────────────────────────────────

export const GameEventParsers = {
  /**
   * Parse CEventNetworkEntityDamage arguments
   */
  parseEntityDamage(args: number[]): EntityDamageEvent {
    return {
      victim: args[0],
      attacker: args[1],
      arg2: args[2],
      arg3: args[3],
      arg4: args[4],
      victimDied: args[5] === 1,
      weaponHash: args[6],
      arg7: args[7],
      arg8: args[8],
      arg9: args[9],
    }
  },

  /**
   * Parse CEventNetworkPlayerEnteredVehicle arguments
   */
  parsePlayerEnteredVehicle(args: number[]): PlayerEnteredVehicleEvent {
    return {
      player: args[0],
      vehicle: args[1],
    }
  },

  /**
   * Parse CEventNetworkPlayerLeftVehicle arguments
   */
  parsePlayerLeftVehicle(args: number[]): PlayerLeftVehicleEvent {
    return {
      player: args[0],
      vehicle: args[1],
    }
  },

  /**
   * Parse CEventShockingSeenPedKilled arguments
   */
  parseSeenPedKilled(args: number[]): SeenPedKilledEvent {
    return {
      witness: args[0],
      victim: args[1],
    }
  },

  /**
   * Parse CEventNetworkVehicleUndrivable arguments
   */
  parseVehicleUndrivable(args: number[]): VehicleUndrivableEvent {
    return {
      vehicle: args[0],
      attacker: args[1],
      weaponHash: args[2],
    }
  },

  /**
   * Parse CEventGunShot arguments
   */
  parseGunShot(args: number[]): GunShotEvent {
    return {
      shooter: args[0],
      coords: {
        x: args[1],
        y: args[2],
        z: args[3],
      },
    }
  },
}

// ─────────────────────────────────────────────────────────────────────────────
// Type mapping for auto-parsing
// ─────────────────────────────────────────────────────────────────────────────

export interface GameEventMap {
  CEventNetworkEntityDamage: EntityDamageEvent
  CEventNetworkPlayerEnteredVehicle: PlayerEnteredVehicleEvent
  CEventNetworkPlayerLeftVehicle: PlayerLeftVehicleEvent
  CEventShockingSeenPedKilled: SeenPedKilledEvent
  CEventNetworkVehicleUndrivable: VehicleUndrivableEvent
  CEventGunShot: GunShotEvent
  // Fallback for unknown events
  [key: string]: unknown
}
