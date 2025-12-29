import { METADATA_KEYS } from '../system/metadata-client.keys'
import type { GameEventMap, GameEventName } from '../types/game-events'

/**
 * Decorator for handling native game events from the RAGE engine.
 *
 * These are low-level events triggered internally by GTA V.
 * FiveM captures them via the 'gameEventTriggered' event.
 *
 * **Documentation:** https://docs.fivem.net/docs/game-references/game-events/
 *
 * ## Common Events:
 *
 * | Event | Description |
 * |-------|-------------|
 * | `CEventNetworkEntityDamage` | Entity receives damage |
 * | `CEventNetworkPlayerEnteredVehicle` | Player enters vehicle |
 * | `CEventNetworkPlayerLeftVehicle` | Player exits vehicle |
 * | `CEventNetworkVehicleUndrivable` | Vehicle destroyed |
 * | `CEventShockingSeenPedKilled` | Ped witnesses death |
 * | `CEventGunShot` | Weapon fired |
 *
 * ## Usage:
 *
 * ```typescript
 * @Controller()
 * class CombatController {
 *   // Raw args (array)
 *   @OnGameEvent('CEventNetworkEntityDamage')
 *   onDamage(args: number[]) {
 *     const [victim, attacker] = args
 *   }
 *
 *   // Or with auto-parsing (set autoParse: true)
 *   @OnGameEvent('CEventNetworkEntityDamage', { autoParse: true })
 *   onDamageParsed(data: EntityDamageEvent) {
 *     console.log(data.victim, data.attacker, data.victimDied)
 *   }
 * }
 * ```
 *
 * @param eventName - The native game event name (CEvent*)
 * @param options - Optional configuration
 */
export function OnGameEvent<K extends GameEventName>(
  eventName: K,
  options?: { autoParse?: boolean },
) {
  return (target: any, propertyKey: string) => {
    Reflect.defineMetadata(
      METADATA_KEYS.GAME_EVENT,
      {
        eventName,
        autoParse: options?.autoParse ?? false,
      },
      target,
      propertyKey,
    )
  }
}

// Re-export types for convenience
export type { GameEventName, GameEventMap }
export type {
  EntityDamageEvent,
  GunShotEvent,
  PlayerEnteredVehicleEvent,
  PlayerLeftVehicleEvent,
  SeenPedKilledEvent,
  VehicleUndrivableEvent,
} from '../types/game-events'
