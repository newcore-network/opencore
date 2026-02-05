import z from 'zod'
import { Player } from '../entities'
import { METADATA_KEYS } from '../system/metadata-server.keys'

export type RpcHandlerOptions = {
  eventName: string
  schema?: z.ZodType
  paramTypes?: unknown[]
}

type ServerNetHandlerRPC<TArgs extends any[] = any[]> = (
  player: Player,
  ...args: TArgs
) => Promise<any>

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
