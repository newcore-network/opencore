import { METADATA_KEYS } from '../system/metadata-client.keys'

/**
 * Registers a method to be executed on every client frame.
 *
 * @remarks
 * This decorator only stores metadata. During bootstrap, the framework binds tick handlers to the
 * client tick loop.
 *
 * Tick handlers should be lightweight and non-blocking.
 *
 * @example
 * ```ts
 * @Client.Controller()
 * export class HudController {
 *   @Client.Tick()
 *   updateHud() {
 *     // ...
 *   }
 * }
 * ```
 */
export function onTick() {
  return (target: any, propertyKey: string) => {
    Reflect.defineMetadata(METADATA_KEYS.TICK, {}, target, propertyKey)
  }
}
