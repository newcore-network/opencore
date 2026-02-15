import z from 'zod'
import { METADATA_KEYS } from '../system/metadata-client.keys'

export type ClientRpcHandlerOptions = {
  eventName: string
  schema?: z.ZodType
  paramTypes?: unknown[]
}

type ClientNetHandlerRPC<TArgs extends any[] = any[], TResult = any> = (
  ...args: TArgs
) => TResult | Promise<TResult>

type ClientRpcHandlerSignatureError = '❌ @Client.OnRPC handlers must be async and return a Promise'

type EnsureValidClientRpcHandler<T> = T extends (...args: any[]) => Promise<any>
  ? T
  : ClientRpcHandlerSignatureError

/**
 * Registers a method as a client-side RPC handler.
 *
 * @remarks
 * Client-only decorator.
 *
 * This decorator is the client counterpart of the server-only `@OnRPC` decorator.
 *
 * - Client: the handler can be called by the server.
 *
 * This decorator only stores metadata. During bootstrap, the framework scans controller methods
 * and binds them using `RpcAPI.on()`.
 *
 * ## Handler signature
 * The handler receives only the RPC payload args (no `Player`).
 *
 * ## Validation
 * Pass a Zod schema to validate incoming args.
 *
 * @example
 * ```ts
 * @Client.Controller()
 * export class UiRpcController {
 *   @Client.OnRPC('ui:ping')
 *   async ping() {
 *     return 'pong'
 *   }
 * }
 * ```
 */
export function OnRPC<TArgs extends any[], TResult = any>(
  eventName: string,
  schemaOrOptions?: z.ZodType | Pick<ClientRpcHandlerOptions, 'schema'>,
) {
  return <H extends EnsureValidClientRpcHandler<ClientNetHandlerRPC<TArgs, TResult>>>(
    target: any,
    propertyKey: string,
    _descriptor: TypedPropertyDescriptor<H>,
  ) => {
    const paramTypes = Reflect.getMetadata('design:paramtypes', target, propertyKey)
    const schema = schemaOrOptions instanceof z.ZodType ? schemaOrOptions : schemaOrOptions?.schema
    const metadata: ClientRpcHandlerOptions = { eventName, schema, paramTypes }
    Reflect.defineMetadata(METADATA_KEYS.NET_RPC, metadata, target, propertyKey)
  }
}
