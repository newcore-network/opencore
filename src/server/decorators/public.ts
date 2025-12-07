import { METADATA_KEYS } from '../system/metadata-server.keys'

/**
 * Marks a server-side NetEvent handler as publicly accessible.
 *
 * This decorator disables authentication requirements for the
 * decorated method. It should only be applied to endpoints used for:
 * - Login
 * - Registration
 * - Public information retrieval
 *
 * ## Security Warning
 * This decorator must be used with caution. Public endpoints must NOT
 * modify sensitive game state unless necessary.
 *
 * ## Example
 * ```ts
 * class AuthServerController {
 *   @Public()
 *   @OnNet("auth:login")
 *   async login(player: Server.Player, credentials: AuthCredentials) {
 *     // no authentication required for this event
 *   }
 * }
 * ```
 *
 * @returns Method decorator that marks a handler as unauthenticated.
 */
export function Public() {
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    Reflect.defineMetadata(METADATA_KEYS.PUBLIC, true, target, propertyKey)
    return descriptor
  }
}
