import { inject, injectable } from 'tsyringe'
import z from 'zod'
import { AppError, SecurityError } from '../../../../'
import { INetTransport } from '../../../../adapters/contracts/INetTransport'
import { type DecoratorProcessor } from '../../../../kernel/di/index'
import { coreLogger, loggers } from '../../../../kernel/logger'
import {
  type NetEventInvalidPayloadContext,
  type NetEventInvalidPayloadReason,
  NetEventSecurityObserverContract,
} from '../../contracts/security/net-event-security-observer.contract'
import { SecurityHandlerContract } from '../../contracts/security/security-handler.contract'
import { NetEventOptions } from '../../decorators'
import { Player } from '../../entities'
import { resolveMethod } from '../../helpers/resolve-method'
import { PlayerDirectoryPort } from '../../services/ports/player-directory.port'
import { METADATA_KEYS } from '../metadata-server.keys'
import { generateSchemaFromTypes } from '../schema-generator'

@injectable()
export class NetEventProcessor implements DecoratorProcessor {
  readonly metadataKey = METADATA_KEYS.NET_EVENT
  private readonly INVALID_COUNTS_META_KEY = 'netEvent.invalidCounts'

  constructor(
    private playerService: PlayerDirectoryPort,
    @inject(SecurityHandlerContract as any) private securityHandler: SecurityHandlerContract,
    @inject(NetEventSecurityObserverContract as any)
    private netEventObserver: NetEventSecurityObserverContract,
    @inject(INetTransport as any) private netTransport: INetTransport,
  ) {}

  process(instance: any, methodName: string, metadata: NetEventOptions) {
    const result = resolveMethod(
      instance,
      methodName,
      `[NetEventProcessor] Method "${methodName}" not found`,
    )
    if (!result) return
    const { handler, handlerName, proto } = result
    const isPublic = Reflect.getMetadata(METADATA_KEYS.PUBLIC, proto, methodName) as boolean
    this.netTransport.onNet(metadata.eventName, async (ctx, ...args: any[]) => {
      const clientId = ctx.clientId
      const player = this.playerService.getByClient(clientId)

      if (!player) {
        loggers.netEvent.warn(`Event ignored: Player session not found`, {
          event: metadata.eventName,
          clientId: clientId,
        })
        return
      }
      // ═══════════════════════════════════════════════════════════════
      // SECURE BY DEFAULT: Require authentication unless @Public()
      // ═══════════════════════════════════════════════════════════════
      if (!isPublic && !player.accountID) {
        loggers.security.warn(`Unauthenticated request blocked`, {
          event: metadata.eventName,
          clientId: clientId,
        })
        return
      }

      let validatedArgs = args
      let schema: z.ZodType | undefined

      try {
        schema = metadata.schema ?? generateSchemaFromTypes(metadata.paramTypes)
      } catch (error) {
        if (error instanceof AppError) {
          loggers.netEvent.fatal(error.message, { playerId: clientId }, error)
          return
        }
        throw error
      }

      if (!schema) {
        loggers.netEvent.fatal(
          `Event '${metadata.eventName}' expects complex args but has no schema. Provide options.schema in @OnNet().`,
          { event: metadata.eventName, playerId: clientId },
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
          await this.handleInvalidPayload({
            player,
            event: metadata.eventName,
            schema,
            receivedArgsCount: args.length,
            reason: 'zod',
            zodError: error,
          })
          return
        }
        if (error instanceof SecurityError) {
          await this.handleInvalidPayload({
            player,
            event: metadata.eventName,
            schema,
            receivedArgsCount: args.length,
            reason: this.reasonFromSecurityError(error),
            violation: error,
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
          await this.handleInvalidPayload({
            player,
            event: metadata.eventName,
            schema,
            receivedArgsCount: args.length,
            reason: this.reasonFromSecurityError(error),
            violation: error,
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

  private async safeHandleViolation(player: Player, violation: SecurityError, event: string) {
    try {
      await this.securityHandler.handleViolation(player, violation)
    } catch (e) {
      loggers.security.fatal(
        `Failed to handle security violation`,
        { event, playerId: player.clientID },
        e as Error,
      )
    }
  }

  private reasonFromSecurityError(error: SecurityError): NetEventInvalidPayloadReason {
    return error.message.includes('Invalid argument count') ? 'arg_count' : 'security_error'
  }
  private async handleInvalidPayload(params: {
    player: Player
    event: string
    schema: z.ZodType
    receivedArgsCount: number
    reason: NetEventInvalidPayloadReason
    zodError?: z.ZodError
    violation?: SecurityError
  }): Promise<void> {
    const invalidCount = this.incrementInvalidCount(params.player, params.event)
    const zodSummary = params.zodError ? this.summarizeZodError(params.zodError) : undefined
    const ctx: NetEventInvalidPayloadContext = {
      event: params.event,
      reason: params.reason,
      playerId: params.player.clientID,
      accountId: params.player.accountID,
      invalidCount,
      zodSummary,
      receivedArgsCount: params.receivedArgsCount,
      expectedArgsCount: this.getExpectedArgsCount(params.schema),
    }
    loggers.netEvent.warn(`Invalid payload`, {
      event: ctx.event,
      playerId: ctx.playerId,
      accountId: ctx.accountId,
      invalidCount: ctx.invalidCount,
      reason: ctx.reason,
      zodSummary: ctx.zodSummary,
    })
    await this.safeObserve(params.player, ctx)
    if (params.violation) {
      await this.safeHandleViolation(params.player, params.violation, params.event)
      return
    }
    if (params.zodError) {
      const violation = new SecurityError('LOG', `Invalid data received in ${params.event}`, {
        issues: zodSummary ?? params.zodError.message,
      })
      await this.safeHandleViolation(params.player, violation, params.event)
    }
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
  private getExpectedArgsCount(schema: z.ZodType): number | undefined {
    if (schema instanceof z.ZodTuple) {
      const defItems = (schema as any)?._def?.items
      if (Array.isArray(defItems)) return defItems.length
      const items = (schema as any)?.items
      if (Array.isArray(items)) return items.length
      return undefined
    }
    return 1
  }
}
