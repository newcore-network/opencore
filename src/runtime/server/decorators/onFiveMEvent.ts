import { METADATA_KEYS } from '../system/metadata-server.keys'

/**
 * Registers a method as a server-side listener for a native FiveM event.
 *
 * @remarks
 * This decorator only stores metadata. During bootstrap, the framework scans controller
 * methods and binds handlers to FiveM events.
 *
 * FiveM server event reference:
 * https://docs.fivem.net/docs/scripting-reference/events/server-events/
 *
 * @param event - FiveM event name (e.g. `"playerJoining"`).
 *
 * @example
 * ```ts
 * @Server.Controller()
 * export class SessionController {
 *   @Server.OnFiveMEvent('playerJoining')
 *   onPlayerJoining() {
 *     // ...
 *   }
 * }
 * ```
 */
export function OnFiveMEvent(event: string) {
  return (target: any, propertyKey: string) => {
    Reflect.defineMetadata(METADATA_KEYS.FIVEM_EVENT, { event }, target, propertyKey)
  }
}
