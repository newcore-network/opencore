import z from 'zod'
import { Player } from '../entities'
import { METADATA_KEYS } from '../system/metadata-server.keys'

/**
 * Metadata stored by {@link OnRPC}.
 *
 * @remarks
 * The framework reads this metadata through {@link OnRpcProcessor} and registers
 * the handler into the active {@link RpcAPI} transport.
 */
export type RpcHandlerOptions = {
  /** RPC event name */
  eventName: string
  /** Optional Zod schema used to validate incoming args */
  schema?: z.ZodType
  /** Runtime reflection metadata from TypeScript (design:paramtypes) */
  paramTypes?: unknown[]
}

/**
 * Server-side RPC handler signature.
 *
 * @remarks
 * The first parameter MUST be {@link Player}. The remaining parameters are the
 * RPC payload.
 */
type ServerNetHandlerRPC<TArgs extends any[] = any[]> = (
  player: Player,
  ...args: TArgs
) => Promise<any>

/**
 * Register an RPC handler.
 *
 * @remarks
 * Server-only decorator.
 *
 * - Server: the handler can be called by clients.
 * - Client: use `Client.OnRPC()` (client runtime) instead.
 *
 * This decorator only registers metadata. The actual wiring happens inside
 * {@link OnRpcProcessor} (server runtime).
 *
 * ## Signature requirements
 * - The first argument MUST be {@link Player}.
 * - Remaining args come from the RPC payload.
 *
 * ## Validation
 * You should provide a Zod schema whenever args are not trivially serializable.
 * If schema is omitted, the framework may attempt to auto-generate one from
 * reflected types.
 *
 * - Tuple schema: use when the RPC sends multiple positional arguments.
 * - Object schema: use when the RPC sends a single DTO.
 *
 * ## Security
 * Unless the method is marked with `@Public()`, the framework will block the
 * request if the player is not authenticated (no `accountID`).
 *
 * @example Tuple args
 * ```ts
 * @OnRPC('inventory:get', z.tuple([z.string(), z.number().int()]))
 * async getInventory(player: Player, itemType: string, page: number) {
 *   ...
 * }
 * ```
 *
 * @example Single DTO arg
 * ```ts
 * const CreateVehicleDto = z.object({ model: z.string(), color: z.string() })
 *
 * @OnRPC('vehicles:create', CreateVehicleDto)
 * async createVehicle(player: Player, dto: z.infer<typeof CreateVehicleDto>) {
 *   ...
 * }
 * ```
 */
export function OnRPC<TArgs extends any[]>(
  eventName: string,
  schemaOrOptions?: z.ZodType | Pick<RpcHandlerOptions, 'schema'>,
) {
  return <H extends ServerNetHandlerRPC<TArgs>>(
    target: any,
    propertyKey: string,
    _descriptor: TypedPropertyDescriptor<H>,
  ) => {
    const paramTypes = Reflect.getMetadata('design:paramtypes', target, propertyKey)
    const schema = schemaOrOptions instanceof z.ZodType ? schemaOrOptions : schemaOrOptions?.schema
    const metadata: RpcHandlerOptions = { eventName, schema, paramTypes }
    Reflect.defineMetadata(METADATA_KEYS.NET_RPC, metadata, target, propertyKey)
  }
}
