import { METADATA_KEYS } from '../system/metadata-client.keys'

/**
 * Decorator for handling native game events.
 * These are events triggered by the game engine itself.
 *
 * Common events:
 * - 'gameEventTriggered' - Generic game event
 * - 'CEventNetworkEntityDamage' - Entity damage
 * - 'CEventNetworkPlayerEnteredVehicle' - Player entered vehicle
 *
 * @param eventName - The native game event name
 */
export function OnGameEvent(eventName: string) {
  return (target: any, propertyKey: string) => {
    Reflect.defineMetadata(METADATA_KEYS.GAME_EVENT, { eventName }, target, propertyKey)
  }
}

