import { injectable } from 'tsyringe'
import { DecoratorProcessor } from '../../../system/decorator-processor'
import { PlayerService } from '../../services/core/player.service'
import { METADATA_KEYS } from '../metadata-server.keys'
import { NetEventOptions } from '../../decorators'
import { SecurityHandlerContract } from '../../templates/security/security-handler.contract'
import { AppError } from '../../../utils'
import { loggers } from '../../../shared/logger'
import z from 'zod'
import { generateSchemaFromTypes } from '../schema-generator'
import { resolveMethod } from '../../helpers/resolve-method'
import { SecurityError } from '../../../utils/error/security.error'

@injectable()
export class NetEventProcessor implements DecoratorProcessor {
  readonly metadataKey = METADATA_KEYS.NET_EVENT

  constructor(
    private playerService: PlayerService,
    private securityHandler: SecurityHandlerContract,
  ) {}

  process(instance: any, methodName: string, metadata: NetEventOptions) {
    const result = resolveMethod(
      instance,
      methodName,
      `[NetEventProcessor] Method "${methodName}" not found`,
    )
    if (!result) return
    const { handler, handlerName, proto } = result

    const isPublic = Reflect.getMetadata(METADATA_KEYS.PUBLIC, proto, methodName) === true

    onNet(metadata.eventName, async (...args: any[]) => {
      const sourceId = Number(source)
      const player = this.playerService.getByClient(sourceId)

      if (!player) {
        loggers.netEvent.warn(`Event ignored: Player session not found`, {
          event: metadata.eventName,
          clientId: sourceId,
        })
        return
      }

      // ═══════════════════════════════════════════════════════════════
      // SECURE BY DEFAULT: Require authentication unless @Public()
      // ═══════════════════════════════════════════════════════════════
      if (!isPublic && !player.accountID) {
        loggers.security.warn(`Unauthenticated request blocked`, {
          event: metadata.eventName,
          clientId: sourceId,
        })
        player.emit('core:auth:required', { event: metadata.eventName })
        return
      }

      let validatedArgs = args
      let schema: z.ZodType | undefined

      try {
        schema = metadata.schema ?? generateSchemaFromTypes(metadata.paramTypes)
      } catch (error) {
        if (error instanceof AppError) {
          loggers.netEvent.fatal(error.message, { playerId: source }, error)
          return
        }
        throw error
      }

      if (!schema) {
        loggers.netEvent.fatal(
          `Event '${metadata.eventName}' expects complex args but has no schema. Provide options.schema in @OnNet().`,
          { event: metadata.eventName, playerId: source },
        )
        return
      }
      try {
        if (schema instanceof z.ZodTuple) {
          validatedArgs = schema.parse(args) as any[]
        } else {
          if (args.length !== 1) {
            throw new SecurityError('LOG', `Invalid argument count in ${metadata.eventName}`, {
              expected: 1,
              received: args.length,
            })
          }
          validatedArgs = [schema.parse(args[0])]
        }
      } catch (error) {
        if (error instanceof z.ZodError) {
          const violation = new SecurityError(
            'LOG',
            `Invalid data received in ${metadata.eventName}`,
            { issues: error.message },
          )
          this.securityHandler.handleViolation(player, violation)
          return
        }
        if (error instanceof SecurityError) {
          this.securityHandler.handleViolation(player, error)
          return
        }
        loggers.netEvent.error(
          `Validation error in event`,
          {
            event: metadata.eventName,
            playerId: player.clientID,
          },
          error as Error,
        )
        return
      }

      try {
        await handler(player, ...validatedArgs)
      } catch (error) {
        if (error instanceof SecurityError) {
          this.securityHandler.handleViolation(player, error)
        }
        loggers.netEvent.error(
          `Handler error in event`,
          {
            event: metadata.eventName,
            handler: handlerName,
            playerId: player.clientID,
          },
          error as Error,
        )
      }
    })

    loggers.netEvent.debug(`Registered: ${metadata.eventName} -> ${handlerName}`)
  }
}
