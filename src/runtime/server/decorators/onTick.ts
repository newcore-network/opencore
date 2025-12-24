import { METADATA_KEYS } from '../system/metadata-server.keys'

/**
 * Registers a method to be executed on every server tick.
 *
 * @remarks
 * This decorator only stores metadata. During bootstrap, the framework binds tick handlers to the
 * FiveM tick cycle.
 *
 * Tick handlers should be lightweight and non-blocking.
 *
 * @example
 * ```ts
 * @Server.Controller()
 * export class SyncController {
 *   @Server.OnTick()
 *   updatePlayers() {
 *     this.service.syncPositions()
 *   }
 * }
 * ```
 */
export function OnTick() {
  return (target: any, propertyKey: string) => {
    Reflect.defineMetadata(METADATA_KEYS.TICK, {}, target, propertyKey)
  }
}
