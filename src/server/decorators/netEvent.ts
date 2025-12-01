import { METADATA_KEYS } from '../system/metadata-server.keys'

/**
 * Decorator used to register a server-side NetEvent handler.
 *
 * ## Player Injection
 * The handler method will **always receive a `ServerPlayer` instance as its
 * first argument**, automatically resolved by the Core based on the client
 * that triggered the event.
 *
 * This means you do NOT need to read `source`, `global.source` or call
 * `GetPlayerIdentifier()`: the Core resolves the player for you.
 *
 * ## Example
 * ```ts
 * export class AuthServerController {
 *   @OnNet('auth:loginAttempt')
 *   handleLogin(player: ServerPlayer, username: string, password: string) {
 *     console.log(player.name, 'is trying to log in');
 *   }
 * }
 * ```
 *
 * ## Event Arguments
 * Any arguments sent from the client will be passed **after** the `ServerPlayer`
 * instance:
 *
 * client → emitNet("auth:loginAttempt", username, password)
 * server → handler(player, username, password)
 *
 * @param eventName - The name of the network event to listen for.
 */
export function OnNet(eventName: string) {
  return (target: any, propertyKey: string) => {
    Reflect.defineMetadata(METADATA_KEYS.NET_EVENT, { eventName }, target, propertyKey)
  }
}
