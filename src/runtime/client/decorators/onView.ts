import { METADATA_KEYS } from '../system/metadata-client.keys'

/**
 * Registers a method as a WebView callback handler.
 *
 * @remarks
 * This decorator only stores metadata. During bootstrap, the framework binds the decorated method
 * to the active WebView runtime callback.
 *
 * @param eventName - Callback name.
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
    Reflect.defineMetadata(METADATA_KEYS.VIEW, { eventName }, target, propertyKey)
  }
}
