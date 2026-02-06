import { inject, injectable } from 'tsyringe'
import z from 'zod'
import { RpcAPI } from '../../../../adapters/contracts/transport/rpc.api'
import { type DecoratorProcessor } from '../../../../kernel/di/decorator-processor'
import { coreLogger, LogDomain } from '../../../../kernel/logger'
import { processTupleSchema } from '../../../server/helpers/process-tuple-schema'
import type { ClientRpcHandlerOptions } from '../../decorators/onRPC'
import { METADATA_KEYS } from '../metadata-client.keys'

const clientRpcLogger = coreLogger.child('Rpc', LogDomain.CLIENT)

@injectable()
export class ClientOnRpcProcessor implements DecoratorProcessor {
  readonly metadataKey = METADATA_KEYS.NET_RPC

  constructor(@inject(RpcAPI as any) private readonly rpc: RpcAPI) {}

  process(target: any, methodName: string, metadata: ClientRpcHandlerOptions) {
    const handler = target[methodName].bind(target)
    const handlerName = `${target.constructor.name}.${methodName}`

    const schema = metadata.schema

    this.rpc.on(metadata.eventName, async (_ctx, ...args: any[]) => {
      try {
        if (!schema) {
          return await handler(...args)
        }

        if (schema instanceof z.ZodTuple) {
          const processedArgs = processTupleSchema(schema, args)
          const validatedArgs = schema.parse(processedArgs) as any[]
          return await handler(...validatedArgs)
        }

        if (args.length !== 1) {
          throw new Error(`Invalid argument count in ${metadata.eventName}`)
        }

        const validated = schema.parse(args[0])
        return await handler(validated)
      } catch (error) {
        clientRpcLogger.error(
          `Handler error in RPC`,
          {
            event: metadata.eventName,
            handler: handlerName,
          },
          error as Error,
        )
        throw error
      }
    })

    clientRpcLogger.debug(`Registered: ${metadata.eventName} -> ${handlerName}`)
  }
}
