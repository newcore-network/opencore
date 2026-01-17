import { METADATA_KEYS } from '../system/metadata-client.keys'

/**
 * Registers a method as an onView callback handler. View are equal to NUI
 *
 * @remarks
 * This decorator only stores metadata. During bootstrap, the framework binds the decorated method
 * to the NUI callback event name.
 *
 * @param eventName - onView callback name.
 *
 * @example
 * ```ts
 * @Client.Controller()
 * export class SettingsController {
 *   @Client.onView('settings:save')
 *   saveSettings(payload: unknown) {
 *     // ...
 *   }
 * }
 * ```
 */
export function OnView(eventName: string) {
  return (target: any, propertyKey: string) => {
    Reflect.defineMetadata(METADATA_KEYS.NUI, { eventName }, target, propertyKey)
  }
}
