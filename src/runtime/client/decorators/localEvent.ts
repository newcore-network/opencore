import { METADATA_KEYS } from '../system/metadata-client.keys'

/**
 * Registers a method as a listener for a local client event.
 *
 * @remarks
 * This decorator only stores metadata. During bootstrap, the framework binds the method to the
 * local event name.
 *
 * @param eventName - Local event name.
 *
 * @example
 * ```ts
 * @Client.Controller()
 * export class UiController {
 *   @Client.OnLocalEvent('ui:toggle')
 *   toggleUi() {
 *     // ...
 *   }
 * }
 * ```
 */
export function OnLocalEvent(eventName: string) {
  return (target: any, propertyKey: string) => {
    Reflect.defineMetadata(METADATA_KEYS.LOCAL_EVENT, { eventName }, target, propertyKey)
  }
}
