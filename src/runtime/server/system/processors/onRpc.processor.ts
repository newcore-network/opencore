import { inject, injectable } from 'tsyringe'
import z from 'zod'
import { AppError } from '../../../../'
import { RpcAPI } from '../../../../adapters/contracts/transport/rpc.api'
import { type DecoratorProcessor } from '../../../../kernel/di/index'
import { loggers } from '../../../../kernel/logger'
import { Player } from '../../entities/player'
import { processTupleSchema } from '../../helpers/process-tuple-schema'
import { resolveMethod } from '../../helpers/resolve-method'
import { Players } from '../../ports/players.api-port'
import { RpcHandlerOptions } from '../../decorators/onRPC'
import { METADATA_KEYS } from '../metadata-server.keys'
import { generateSchemaFromTypes } from '../schema-generator'

@injectable()
export class OnRpcProcessor implements DecoratorProcessor {
  readonly metadataKey = METADATA_KEYS.NET_RPC
  private readonly INVALID_COUNTS_META_KEY = 'rpcEvent.invalidCounts'

  constructor(
    @inject(Players as any) private readonly players: Players,
    @inject(RpcAPI as any) private readonly rpc: RpcAPI<'server'>,
  ) {}

  process(instance: any, methodName: string, metadata: RpcHandlerOptions): void {
    const result = resolveMethod(
      instance,
      methodName,
      `[OnRpcProcessor] Method "${methodName}" not found`,
    )
    if (!result) return
    const { handler, handlerName, proto } = result

    const isPublic = Reflect.getMetadata(METADATA_KEYS.PUBLIC, proto, methodName) as boolean

    const invalidCounts =
      (Reflect.getMetadata(this.INVALID_COUNTS_META_KEY, proto) as Set<string> | undefined) ??
      new Set<string>()
    const key = `${metadata.eventName}:${handlerName}`
    if (invalidCounts.has(key)) return

    const paramTypes = metadata.paramTypes
    const hasDesignParamTypes = Array.isArray(paramTypes)
    const hasNoDeclaredParams = hasDesignParamTypes && paramTypes.length === 0
    const expectsPlayer = hasDesignParamTypes && paramTypes.length > 0 && paramTypes[0] === Player

    if (hasDesignParamTypes && paramTypes.length > 0 && paramTypes[0] !== Player) {
      invalidCounts.add(key)
      Reflect.defineMetadata(this.INVALID_COUNTS_META_KEY, invalidCounts, proto)
      throw new Error(`@OnRPC '${metadata.eventName}' must declare Player as the first parameter`)
    }

    let schema: z.ZodType | undefined
    try {
      if (metadata.schema) {
        schema = metadata.schema
      } else if (hasNoDeclaredParams) {
        schema = z.tuple([])
      } else if (hasDesignParamTypes) {
        schema = generateSchemaFromTypes(paramTypes)
      } else {
        invalidCounts.add(key)
        Reflect.defineMetadata(this.INVALID_COUNTS_META_KEY, invalidCounts, proto)
        throw new Error(
          `@OnRPC '${metadata.eventName}' requires schema when design:paramtypes metadata is unavailable`,
        )
      }
    } catch (error) {
      if (error instanceof AppError) {
        loggers.netEvent.fatal(error.message, { event: metadata.eventName }, error)
        invalidCounts.add(key)
        Reflect.defineMetadata(this.INVALID_COUNTS_META_KEY, invalidCounts, proto)
        return
      }
      throw error
    }

    if (!schema) {
      loggers.netEvent.fatal(
        `RPC '${metadata.eventName}' expects complex args but has no schema. Provide schema in @OnRPC().`,
        { event: metadata.eventName },
      )
      invalidCounts.add(key)
      Reflect.defineMetadata(this.INVALID_COUNTS_META_KEY, invalidCounts, proto)
      return
    }

    this.rpc.on(metadata.eventName, async (ctx, ...args: any[]) => {
      const clientId = ctx.clientId
      if (clientId === undefined) {
        loggers.netEvent.warn(`RPC ignored: Missing clientId in context`, {
          event: metadata.eventName,
        })
        return
      }

      const player = this.players.getByClient(clientId)
      if (!player) {
        loggers.netEvent.warn(`RPC ignored: Player session not found`, {
          event: metadata.eventName,
          clientId,
        })
        return
      }

      if (!isPublic && !player.accountID) {
        loggers.security.warn(`Unauthenticated RPC blocked`, {
          event: metadata.eventName,
          clientId,
        })
        return
      }

      let validatedArgs: any[] = args
      try {
        if (schema instanceof z.ZodTuple) {
          const processedArgs = processTupleSchema(schema, args)
          validatedArgs = schema.parse(processedArgs) as any[]
        } else {
          if (args.length !== 1) {
            throw new Error(`Invalid argument count in ${metadata.eventName}`)
          }
          validatedArgs = [schema.parse(args[0])]
        }
      } catch (error) {
        loggers.netEvent.warn(`Invalid RPC payload`, {
          event: metadata.eventName,
          clientId,
        })
        throw error
      }

      if (hasNoDeclaredParams) {
        return handler()
      }

      return handler(player, ...validatedArgs)
    })

    loggers.netEvent.debug(`Registered RPC: ${metadata.eventName} -> ${handlerName}`)
  }
}
