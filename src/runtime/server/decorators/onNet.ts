import { METADATA_KEYS } from '../system/metadata-server.keys'
import type { z } from 'zod'
import type { Player } from '../entities/player'

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
 * - If `options.schema` is provided:
 *   - `z.tuple([...])` validates all positional args.
 *   - otherwise: expects exactly 1 arg and validates `args[0]` (DTO payload pattern).
 * - If `options.schema` is omitted, only primitive args can be auto-validated from runtime param types
 *   (`string|number|boolean|any[]`). Complex payloads should use an explicit schema.
 *
 * Authentication:
 * - Handlers are typically protected by the framework's net-event security layer.
 * - Use {@link Public} to explicitly mark a handler as unauthenticated.
 *
 * @param eventName - Network event name.
 * @param options - Optional config.
 * @param options.schema - Zod schema for payload validation.
 *
 * @example
 * ```ts
 * @Server.Controller()
 * export class ExampleController {
 *   @Server.OnNet('example:ping')
 *   ping(player: Player, message: string) {
 *     // ...
 *   }
 * }
 * ```
 */
export function OnNet<TArgs extends any[]>(
  eventName: string,
  options?: Pick<NetEventOptions, 'schema'>,
) {
  return <H extends ServerNetHandler<TArgs>>(
    target: any,
    propertyKey: string,
    _descriptor: TypedPropertyDescriptor<H>,
  ) => {
    const paramTypes = Reflect.getMetadata('design:paramtypes', target, propertyKey)
    const metadata: NetEventOptions = { eventName, schema: options?.schema, paramTypes }
    Reflect.defineMetadata(METADATA_KEYS.NET_EVENT, metadata, target, propertyKey)
  }
}
