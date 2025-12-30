import { METADATA_KEYS } from '../system/metadata-server.keys'
import { CoreEventMap } from '../types/core-events'

/**
 * Registers a method as a listener for an internal OpenCore framework event.
 *
 * @remarks
 * This decorator only stores metadata. The framework binds listeners during bootstrap by scanning
 * controller methods.
 *
 * @param event - Core event name, strongly typed to {@link CoreEventMap}.
 *
 * @example
 * ```ts
 * @Server.Controller()
 * export class SystemController {
 *   @Server.OnFrameworkEvent('server:ready')
 *   onServerReady() {
 *     console.log('OpenCore framework is ready')
 *   }
 * }
 * ```
 */
export function OnFrameworkEvent<K extends keyof CoreEventMap>(event: K) {
  return (target: any, propertyKey: string) => {
    Reflect.defineMetadata(METADATA_KEYS.CORE_EVENT, { event }, target, propertyKey)
  }
}
