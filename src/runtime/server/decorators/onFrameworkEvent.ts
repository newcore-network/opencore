import { METADATA_KEYS } from '../system/metadata-server.keys'
import { FrameworkEventsMap } from '../types/framework-events.types'

/**
 * Registers a method as a listener for an internal OpenCore framework event.
 *
 * @remarks
 * This decorator only stores metadata. The framework binds listeners during bootstrap by scanning
 * controller methods.
 *
 * The handler receives the framework payload associated with the selected event from
 * {@link FrameworkEventsMap}. Unlike {@link OnRuntimeEvent}, this payload is framework-defined
 * and may include hydrated entities such as {@link Player}.
 *
 * Framework events are delivered:
 * - locally in `STANDALONE`
 * - locally inside `CORE`
 * - from `CORE` to `RESOURCE` through the internal framework bridge
 *
 * For bridged events, the transport payload is serialized in `CORE` and then rehydrated in the
 * receiving `RESOURCE`. That means handlers can keep using the same payload shape in every mode.
 *
 * Current built-in payloads:
 * - `internal:playerSessionCreated`: `{ clientId, license }`
 * - `internal:playerSessionDestroyed`: `{ clientId }`
 * - `internal:playerFullyConnected`: `{ player }`
 * - `internal:playerSessionRecovered`: `{ clientId, license, player }`
 *
 * @param event - Internal event name, strongly typed to {@link FrameworkEventsMap}.
 *
 * @example
 * ```ts
 * @Server.Controller()
 * export class SystemController {
 *   @Server.OnFrameworkEvent('internal:playerFullyConnected')
 *   onPlayerConnected(payload: PlayerFullyConnectedPayload) {
 *     console.log(`Player ${payload.player.clientID} connected`)
 *   }
 * }
 * ```
 */
export function OnFrameworkEvent<K extends keyof FrameworkEventsMap>(event: K) {
  return (target: object, propertyKey: string | symbol, _descriptor: PropertyDescriptor): void => {
    Reflect.defineMetadata(METADATA_KEYS.INTERNAL_EVENT, { event }, target, propertyKey)
  }
}
