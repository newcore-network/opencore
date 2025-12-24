import { METADATA_KEYS } from '../system/metadata-client.keys'

/**
 * Registers a method as an NUI callback handler.
 *
 * @remarks
 * This decorator only stores metadata. During bootstrap, the framework binds the decorated method
 * to the NUI callback event name.
 *
 * @param eventName - NUI callback name.
 *
 * @example
 * ```ts
 * @Client.Controller()
 * export class SettingsController {
 *   @Client.NuiCallback('settings:save')
 *   saveSettings(payload: unknown) {
 *     // ...
 *   }
 * }
 * ```
 */
export function NuiCallback(eventName: string) {
  return (target: any, propertyKey: string) => {
    Reflect.defineMetadata(METADATA_KEYS.NUI, { eventName }, target, propertyKey)
  }
}
