import { METADATA_KEYS } from '../system/metadata-client.keys'

/**
 * Registers a method to be called when the current resource starts (client-side).
 *
 * @remarks
 * This decorator only stores metadata. During bootstrap, the framework binds the method to the
 * resource lifecycle events.
 *
 * @example
 * ```ts
 * @Client.Controller()
 * export class LifecycleController {
 *   @Client.OnResourceStart()
 *   onStart() {
 *     // ...
 *   }
 * }
 * ```
 */
export function OnResourceStart() {
  return (target: any, propertyKey: string) => {
    Reflect.defineMetadata(METADATA_KEYS.RESOURCE_START, {}, target, propertyKey)
  }
}

/**
 * Registers a method to be called when the current resource is stopping (client-side).
 *
 * @remarks
 * This decorator only stores metadata. During bootstrap, the framework binds the method to the
 * resource lifecycle events.
 *
 * Use this for cleanup operations.
 *
 * @example
 * ```ts
 * @Client.Controller()
 * export class LifecycleController {
 *   @Client.OnResourceStop()
 *   onStop() {
 *     // ...
 *   }
 * }
 * ```
 */
export function OnResourceStop() {
  return (target: any, propertyKey: string) => {
    Reflect.defineMetadata(METADATA_KEYS.RESOURCE_STOP, {}, target, propertyKey)
  }
}
