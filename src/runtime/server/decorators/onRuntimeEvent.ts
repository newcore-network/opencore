import type { RuntimeEventName } from '../../../adapters/contracts/runtime'
import { METADATA_KEYS } from '../system/metadata-server.keys'

/**
 * Registers a method as a server-side listener for a native Runtime event.
 * Runtime === CitizenFX (Cfx)
 *
 * @remarks
 * This decorator only stores metadata. During bootstrap, the framework scans controller
 * methods and binds handlers to runtime events.
 *
 * The decorated method receives the raw runtime arguments emitted by the adapter for
 * the selected event. OpenCore does not wrap these arguments into an object payload and
 * does not automatically resolve a {@link Player} entity for you.
 *
 * Common server event signatures in the current runtime map:
 * - `playerJoining`: `(clientId: number, identifiers?: Record<string, string>)`
 * - `playerDropped`: `(clientId: number)`
 * - `onServerResourceStop`: `(resourceName: string)`
 * - `playerCommand`: runtime-specific raw arguments from the adapter
 *
 * If you need a framework-managed payload such as `{ player }`, use
 * {@link OnFrameworkEvent} instead.
 *
 * CitizenFX server event reference:
 * https://docs.fivem.net/docs/scripting-reference/events/server-events/
 *
 * @param event - event name (e.g. `"playerJoining"`). Runtime events
 *
 * @example
 * ```ts
 * @Server.Controller()
 * export class SessionController {
 *   @Server.OnRuntimeEvent('playerJoining')
 *   onPlayerJoining(clientId: number, identifiers?: Record<string, string>) {
 *     // Raw runtime arguments
 *   }
 * }
 * ```
 */
export function OnRuntimeEvent(event: RuntimeEventName) {
  return (target: any, propertyKey: string) => {
    Reflect.defineMetadata(METADATA_KEYS.RUNTIME_EVENT, { event }, target, propertyKey)
  }
}
