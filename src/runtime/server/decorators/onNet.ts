import { z } from 'zod'
import { Player } from '../entities/player'
import { METADATA_KEYS } from '../system/metadata-server.keys'

export interface NetEventOptions {
  /**
   * The network event name to register.
   */
  eventName: string
  /**
   * Zod schema for payload validation.
   * - `z.tuple([...])`: validates all positional args.
   * - otherwise: expects exactly 1 arg and validates `args[0]` (DTO payload pattern).
   */
  schema?: z.ZodType
  /**
   * Runtime parameter types for auto-validation.
   */
  paramTypes: any
}

type ServerNetHandler<TArgs extends any[] = any[]> = (player: Player, ...args: TArgs) => any

/**
 * Registers a method as a server-side network event handler.
 *
 * @remarks
 * Rules:
 * - First parameter must be `Player` (injected from the caller).
 *
 * Validation:
 * - If schema is provided:
 *   - `z.tuple([...])` validates all positional args.
 *   - otherwise: expects exactly 1 arg and validates `args[0]` (DTO payload pattern).
 * - If schema is omitted, only primitive args can be auto-validated from runtime param types
 *   (`string|number|boolean|any[]`). Complex payloads should use an explicit schema.
 *
 * Authentication:
 * - Handlers are typically protected by the framework's net-event security layer.
 * - Use {@link Public} to explicitly mark a handler as unauthenticated.
 *
 * @param eventName - Network event name.
 * @param schemaOrOptions - Zod schema directly, or options object with schema property.
 *
 * @example
 * ```ts
 * import { z, Infer } from '@open-core/framework'
 *
 * const PayloadSchema = z.object({ message: z.string() })
 *
 * @Server.Controller()
 * export class ExampleController {
 *   // Simple handler (no schema)
 *   @Server.OnNet('example:ping')
 *   ping(player: Server.Player, message: string) { }
 *
 *   // With schema directly (recommended)
 *   @Server.OnNet('example:data', PayloadSchema)
 *   handleData(player: Server.Player, data: Infer<typeof PayloadSchema>) { }
 *
 *   // With options object (legacy)
 *   @Server.OnNet('example:legacy', { schema: PayloadSchema })
 *   handleLegacy(player: Server.Player, data: Infer<typeof PayloadSchema>) { }
 * }
 * ```
 */
// Overload: Schema as second argument (recommended)
export function OnNet<TArgs extends any[]>(
  eventName: string,
  schema: z.ZodType,
): <H extends ServerNetHandler<TArgs>>(
  target: any,
  propertyKey: string,
  descriptor: TypedPropertyDescriptor<H>,
) => void

// Overload: Options object (legacy, for backwards compatibility)
export function OnNet<TArgs extends any[]>(
  eventName: string,
  options?: Pick<NetEventOptions, 'schema'>,
): <H extends ServerNetHandler<TArgs>>(
  target: any,
  propertyKey: string,
  descriptor: TypedPropertyDescriptor<H>,
) => void

// Implementation
export function OnNet<TArgs extends any[]>(
  eventName: string,
  schemaOrOptions?: z.ZodType | Pick<NetEventOptions, 'schema'>,
) {
  return <H extends ServerNetHandler<TArgs>>(
    target: any,
    propertyKey: string,
    _descriptor: TypedPropertyDescriptor<H>,
  ) => {
    const paramTypes = Reflect.getMetadata('design:paramtypes', target, propertyKey)

    // Detect if second arg is a Zod schema or an options object
    const schema = schemaOrOptions instanceof z.ZodType ? schemaOrOptions : schemaOrOptions?.schema

    const metadata: NetEventOptions = { eventName, schema, paramTypes }
    Reflect.defineMetadata(METADATA_KEYS.NET_EVENT, metadata, target, propertyKey)
  }
}
