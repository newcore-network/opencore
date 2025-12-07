import { METADATA_KEYS } from '../system/metadata-server.keys'
import type { z } from 'zod'
import type { Player } from '../entities/player'

export interface NetEventOptions {
  eventName: string
  schema?: z.ZodType
}

/**
 * Registers a server-side network event handler.
 *
 * The decorated method is invoked when the client triggers
 * `emitNet(eventName, ...)`.
 *
 * ## Player Injection
 * The first argument of the handler is automatically replaced
 * with a `Server.Player` instance representing the client that
 * fired the event. You do NOT need to read `source` manually.
 *
 * ## Payload Validation
 * If a Zod schema is provided, the incoming arguments are
 * validated before method execution. Invalid payloads are rejected.
 *
 * ## Example
 * ```ts
 * export class AuthServerController {
 *   @OnNet("auth:login")
 *   handleLogin(player: Server.Player, username: string, password: string) {
 *     // player is automatically resolved from source
 *   }
 * }
 * ```
 *
 * @param eventName - The network event name to listen for.
 * @param schema - Optional Zod schema to validate incoming data.
 */

type AnyNetEventHandler = (player: Player, ...args: any[]) => any;

export function OnNet<T extends z.ZodType | undefined = undefined>(
  eventName: string,
  schema?: T
) {
  return <H extends AnyNetEventHandler>(
    target: any,
    propertyKey: string,
    descriptor: TypedPropertyDescriptor<H>
  ) => {
    const metadata: NetEventOptions = { eventName, schema }
    Reflect.defineMetadata(METADATA_KEYS.NET_EVENT, metadata, target, propertyKey)
  }
}