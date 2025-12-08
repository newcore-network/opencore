import { METADATA_KEYS } from '../system/metadata-server.keys'
import type { CoreEventMap } from '../types/core-events'

/**
 * Method decorator used to register a method as a listener for an internal OpenCore framework event.
 *
 * When the specified framework event is emitted, this method will be automatically triggered
 * with the arguments provided by the event payload.
 *
 * @param event - The name of the core event to listen for (typed strictly to `CoreEventMap`).
 *
 *
 * ```ts
 * @Server.Controller()
 * export class SystemController {
 *
 *   @OnCoreEvent('server:ready')
 *   public onServerStart() {
 *     console.log('OpenCore Framework is ready!')
 *   }
 * }
 * ```
 */
export function OnCoreEvent<K extends keyof CoreEventMap>(event: K) {
  return (target: any, propertyKey: string) => {
    Reflect.defineMetadata(METADATA_KEYS.CORE_EVENT, { event }, target, propertyKey)
  }
}
