import { METADATA_KEYS } from '../system/metadata-server.keys'
import type { z } from 'zod'
import type { Player } from '../entities/player'

export interface NetEventOptions {
  eventName: string
  schema?: z.ZodType
  paramTypes?: any
}

type ServerNetHandler<TArgs extends any[] = any[]> = (player: Player, ...args: TArgs) => any;

/**
 * Registers a server-side network event handler.
 *
 * The decorated method is invoked when the client triggers
 * `emitNet(eventName, ...)`.
 *
 * ## Player Injection
 * The first argument of the handler **must be `Player`** and is automatically
 * replaced with a `Server.Player` instance representing the client that
 * fired the event. You do NOT need to read `source` manually.
 *
 * ## Auto-Validation
 * Arguments after `Player` are automatically validated based on their TypeScript types:
 * - `string` → `z.string()`
 * - `number` → `z.number()`
 * - `boolean` → `z.boolean()`
 * - `any[]` → `z.array(z.any())` (array content not validated)
 *
 * ## Explicit Schema (Advanced)
 * For stricter validation (ranges, formats, nested objects), provide a Zod schema:
 *
 * @example Auto-validation (simple)
 * ```ts
 * @OnNet("auth:login")
 * handleLogin(player: Player, username: string, password: string) {
 *   // username and password are validated as strings automatically
 * }
 * ```
 *
 * @example Explicit schema (strict validation)
 * ```ts
 * const transferSchema = z.object({
 *   targetId: z.number().positive(),
 *   amount: z.number().min(1).max(1000000),
 * })
 *
 * @OnNet("bank:transfer", { schema: transferSchema })
 * handleTransfer(player: Player, data: z.infer<typeof transferSchema>) {
 *   // data.amount is guaranteed to be between 1 and 1,000,000
 * }
 * ```
 *
 * @param eventName - The network event name to listen for.
 * @param options - Optional configuration object.
 * @param options.schema - Zod schema for strict payload validation.
 */
export function OnNet<TArgs extends any[]>(
  eventName: string,
  options?: { schema?: z.ZodType }
) {
  return <H extends ServerNetHandler<TArgs>>(
    target: any,
    propertyKey: string,
    descriptor: TypedPropertyDescriptor<H>
  ) => {
    const paramTypes = Reflect.getMetadata('design:paramtypes', target, propertyKey)
    const metadata: NetEventOptions = { eventName, schema: options?.schema, paramTypes }
    Reflect.defineMetadata(METADATA_KEYS.NET_EVENT, metadata, target, propertyKey)
  }
}