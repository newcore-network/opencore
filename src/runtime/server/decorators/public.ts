import { METADATA_KEYS } from '../system/metadata-server.keys'

/**
 * Marks a server-side net-event handler as publicly accessible.
 *
 * @remarks
 * This decorator disables authentication requirements for the decorated method.
 * It is intended to be used together with {@link OnNet}.
 *
 * Security warning:
 * - Use with caution.
 * - Public endpoints should not mutate sensitive game state unless strictly necessary.
 *
 * @returns Method decorator that marks a handler as unauthenticated.
 *
 * @example
 * ```ts
 * @Server.Controller()
 * export class AuthController {
 *   @Server.Public()
 *   @Server.OnNet('auth:login')
 *   async login(player: Server.Player, credentials: AuthCredentials) {
 *     // no authentication required for this event
 *   }
 * }
 * ```
 */
export function Public() {
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    Reflect.defineMetadata(METADATA_KEYS.PUBLIC, true, target, propertyKey)
    return descriptor
  }
}
