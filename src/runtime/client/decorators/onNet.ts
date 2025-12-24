import { METADATA_KEYS } from '../system/metadata-client.keys'

/**
 * Registers a method as a client-side network event handler.
 *
 * @remarks
 * This decorator only stores metadata. During bootstrap, the framework scans controller methods
 * and binds them to client net events.
 *
 * @param eventName - Network event name.
 *
 * @example
 * ```ts
 * @Client.Controller()
 * export class UiController {
 *   @Client.OnNet('ui:setVisible')
 *   setVisible(isVisible: boolean) {
 *     // ...
 *   }
 * }
 * ```
 */
export function OnNet(eventName: string) {
  return (target: any, propertyKey: string) => {
    Reflect.defineMetadata(METADATA_KEYS.NET_EVENT, { eventName }, target, propertyKey)
  }
}
