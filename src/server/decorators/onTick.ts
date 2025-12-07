import { METADATA_KEYS } from '../system/metadata-server.keys'

/**
 * OnTick
 * ------------------------------------------------------------
 * Marks a method to be executed on every server tick.
 *
 * Methods decorated with `@OnTick()` are automatically
 * registered by the framework's scheduler and invoked on each
 * FXServer tick (~ every 0–10 ms depending on workload).
 *
 * This decorator should be used for lightweight recurring
 * logic: status updates, background checks, cleanup tasks,
 * or time-based processes relevant to gameplay.
 *
 * Heavy or blocking operations should be avoided inside tick
 * handlers, as they directly impact global server performance.
 *
 * ```ts
 * export class SyncController {
 *   @OnTick()
 *   updatePlayers() {
 *     // Runs every tick
 *     this.service.syncPositions()
 *   }
 * }
 *
 * ```
 *
 * Internally, the decorator only stores metadata. The
 * server bootstrap scans for this metadata and binds the
 * method to FiveM's tick cycle.
 */
export function OnTick() {
  return (target: any, propertyKey: string) => {
    Reflect.defineMetadata(METADATA_KEYS.TICK, {}, target, propertyKey)
  }
}
