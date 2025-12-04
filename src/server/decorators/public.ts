import { METADATA_KEYS } from '../system/metadata-server.keys'

/**
 * **Only works on NetEvents in Server-side**
 *
 * Marks an endpoint as publicly accessible (no authentication required).
 * Use only for login, register, or public info endpoints.
 *
 * @example
 * ```ts
 * class AuthServerController {
 *   @ Server.Public()
 *   @ Server.OnNet('auth:login')
 *   async login(player: Server.Player, credentials: AuthCredentials) { ... }
 * }
 * ```
 *  */
export function Public() {
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    Reflect.defineMetadata(METADATA_KEYS.PUBLIC, true, target, propertyKey)
    return descriptor
  }
}
