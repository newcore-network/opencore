import { injectable } from 'tsyringe'
import { DecoratorProcessor } from '../../../system/decorator-processor'
import { PlayerService } from '../../services/core/player.service'
import { METADATA_KEYS } from '../metadata-server.keys'
import { NetEventOptions } from '../../decorators'
import { SecurityHandlerContract } from '../../templates/security/security-handler.contract'
import { AppError } from '../../../utils'
import { coreLogger, loggers } from '../../../shared/logger'
import z from 'zod'
import { generateSchemaFromTypes } from '../schema-generator'
import { resolveMethod } from '../../helpers/resolve-method'
import { SecurityError } from '../../../utils/error/security.error'
import {
  NetEventInvalidPayloadContext,
  NetEventSecurityObserverContract,
} from '../../templates/security/net-event-security-observer.contract'
import { Player } from '../../entities'

@injectable()
export class NetEventProcessor implements DecoratorProcessor {
  readonly metadataKey = METADATA_KEYS.NET_EVENT
  private readonly INVALID_COUNTS_META_KEY = 'netEvent.invalidCounts'

  constructor(
    private playerService: PlayerService,
    private securityHandler: SecurityHandlerContract,
    private netEventObserver: NetEventSecurityObserverContract,
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
          const invalidCount = this.incrementInvalidCount(player, metadata.eventName)
          const zodSummary = this.summarizeZodError(error)

          const ctx: NetEventInvalidPayloadContext = {
            event: metadata.eventName,
            reason: 'zod',
            playerId: player.clientID,
            accountId: player.accountID,
            invalidCount,
            zodSummary,
            receivedArgsCount: args.length,
            expectedArgsCount: schema instanceof z.ZodTuple ? schema.array.length : 1,
          }

          loggers.netEvent.warn(`Invalid payload`, {
            event: ctx.event,
            playerId: ctx.playerId,
            accountId: ctx.accountId,
            invalidCount: ctx.invalidCount,
            zodSummary: ctx.zodSummary,
          })

          await this.safeObserve(player, ctx)

          const violation = new SecurityError(
            'LOG',
            `Invalid data received in ${metadata.eventName}`,
            { issues: zodSummary },
          )

          await this.securityHandler.handleViolation(player, violation).catch(() => {
            coreLogger.error(`Failed to handle security violation`, {
              event: metadata.eventName,
              playerId: player.clientID,
            })
          })

          return
        }
        if (error instanceof SecurityError) {
          const invalidCount = this.incrementInvalidCount(player, metadata.eventName)

          const ctx: NetEventInvalidPayloadContext = {
            event: metadata.eventName,
            reason: error.message.includes('Invalid argument count')
              ? 'arg_count'
              : 'security_error',
            playerId: player.clientID,
            accountId: player.accountID,
            invalidCount,
            receivedArgsCount: args.length,
            expectedArgsCount: schema instanceof z.ZodTuple ? schema.array.length : 1,
          }

          loggers.netEvent.warn(`Invalid payload`, {
            event: ctx.event,
            playerId: ctx.playerId,
            accountId: ctx.accountId,
            invalidCount: ctx.invalidCount,
            reason: ctx.reason,
          })

          await this.safeObserve(player, ctx)

          await this.securityHandler.handleViolation(player, error).catch(() => {
            coreLogger.error(`Failed to handle security violation`, {
              event: metadata.eventName,
              playerId: player.clientID,
            })
          })

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
          const invalidCount = this.incrementInvalidCount(player, metadata.eventName)

          const ctx: NetEventInvalidPayloadContext = {
            event: metadata.eventName,
            reason: error.message.includes('Invalid argument count')
              ? 'arg_count'
              : 'security_error',
            playerId: player.clientID,
            accountId: player.accountID,
            invalidCount,
            receivedArgsCount: args.length,
            expectedArgsCount: schema instanceof z.ZodTuple ? schema.array.length : 1,
          }

          loggers.netEvent.warn(`Invalid payload`, {
            event: ctx.event,
            playerId: ctx.playerId,
            accountId: ctx.accountId,
            invalidCount: ctx.invalidCount,
            reason: ctx.reason,
          })

          await this.safeObserve(player, ctx)

          await this.securityHandler.handleViolation(player, error).catch(() => {
            coreLogger.error(`Failed to handle security violation`, {
              event: metadata.eventName,
              playerId: player.clientID,
            })
          })

          return
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

  private incrementInvalidCount(player: Player, event: string): number {
    const counts = (player.getMeta<Record<string, number>>(this.INVALID_COUNTS_META_KEY) ??
      {}) as Record<string, number>
    counts[event] = (counts[event] ?? 0) + 1
    player.setMeta(this.INVALID_COUNTS_META_KEY, counts)
    return counts[event]
  }

  private summarizeZodError(error: z.ZodError, maxIssues = 3): string[] {
    return error.issues.slice(0, maxIssues).map((issue) => {
      const path = issue.path.length ? issue.path.join('.') : '<root>'
      return `${path}: ${issue.message}`
    })
  }

  private async safeObserve(player: Player, ctx: NetEventInvalidPayloadContext): Promise<void> {
    try {
      await this.netEventObserver.onInvalidPayload(player, ctx)
    } catch (e) {
      coreLogger.error(
        `NetEvent observer failed`,
        { event: ctx.event, playerId: player.clientID },
        e as Error,
      )
    }
  }
}
