import { METADATA_KEYS } from '../system/metadata-server.keys'
import { CoreEventMap } from '../types/core-events'

/**
 * Handler function type for framework events.
 * Accepts the event payload and returns void or Promise<void>.
 */
type FrameworkEventHandler<K extends keyof CoreEventMap> = (
  payload: CoreEventMap[K],
) => void | Promise<void>

/**
 * Registers a method as a listener for an internal OpenCore framework event.
 *
 * @remarks
 * This decorator only stores metadata. The framework binds listeners during bootstrap by scanning
 * controller methods.
 *
 * The method signature is type-checked against the event payload. TypeScript will error if
 * the handler parameter type doesn't match the expected payload for the specified event.
 *
 * @param event - Core event name, strongly typed to {@link CoreEventMap}.
 *
 * @example
 * ```ts
 * @Server.Controller()
 * export class SystemController {
 *   @Server.OnFrameworkEvent('core:playerSessionCreated')
 *   onPlayerSession(payload: PlayerSessionCreatedPayload) {
 *     console.log(`Player ${payload.clientId} connected`)
 *   }
 * }
 * ```
 */
export function OnFrameworkEvent<K extends keyof CoreEventMap>(event: K) {
  return (
    target: object,
    propertyKey: string | symbol,
    _descriptor: TypedPropertyDescriptor<FrameworkEventHandler<K>>,
  ): void => {
    Reflect.defineMetadata(METADATA_KEYS.CORE_EVENT, { event }, target, propertyKey)
  }
}
