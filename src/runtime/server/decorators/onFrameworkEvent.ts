import { METADATA_KEYS } from '../system/metadata-server.keys'
import { FrameworkEventsMap } from '../types/framework-events.types'

/**
 * Registers a method as a listener for an internal OpenCore framework event.
 *
 * @remarks
 * This decorator only stores metadata. The framework binds listeners during bootstrap by scanning
 * controller methods.
 *
 * The handler should accept the payload type corresponding to the event from {@link FrameworkEventsMap}.
 *
 * @param event - Internal event name, strongly typed to {@link FrameworkEventsMap}.
 *
 * @example
 * ```ts
 * @Server.Controller()
 * export class SystemController {
 *   @Server.OnFrameworkEvent('internal:playerFullyConnected')
 *   onPlayerConnected(payload: PlayerFullyConnectedPayload) {
 *     console.log(`Player ${payload.player.session.clientId} connected`)
 *   }
 * }
 * ```
 */
export function OnFrameworkEvent<K extends keyof FrameworkEventsMap>(event: K) {
  return (target: object, propertyKey: string | symbol, _descriptor: PropertyDescriptor): void => {
    Reflect.defineMetadata(METADATA_KEYS.INTERNAL_EVENT, { event }, target, propertyKey)
  }
}
