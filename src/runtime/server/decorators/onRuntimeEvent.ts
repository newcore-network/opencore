import { METADATA_KEYS } from '../system/metadata-server.keys'

/**
 * Registers a method as a server-side listener for a native Runtime event.
 * Runtime === FiveM
 *
 * @remarks
 * This decorator only stores metadata. During bootstrap, the framework scans controller
 * methods and binds handlers to FiveM events.
 *
 * FiveM server event reference:
 * https://docs.fivem.net/docs/scripting-reference/events/server-events/
 *
 * @param event - event name (e.g. `"playerJoining"`). FiveM Events
 *
 * @example
 * ```ts
 * @Server.Controller()
 * export class SessionController {
 *   @Server.OnRuntimeEvent('playerJoining')
 *   onPlayerJoining() {
 *     // ...
 *   }
 * }
 * ```
 */
export function OnRuntimeEvent(event: string) {
  return (target: any, propertyKey: string) => {
    Reflect.defineMetadata(METADATA_KEYS.RUNTIME_EVENT, { event }, target, propertyKey)
  }
}
