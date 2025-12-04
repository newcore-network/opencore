import { injectable } from 'tsyringe'
import { DecoratorProcessor } from '../../../system/decorator-processor'
import { PlayerService } from '../../services/player.service'
import { METADATA_KEYS } from '../metadata-server.keys'
import { NetEventOptions } from '../../decorators'
import { SecurityHandlerContract } from '../../templates/security/security-handler.contract'
import { SecurityError } from '../../../utils'
import { loggers } from '../../../shared/logger'
import z from 'zod'

@injectable()
export class NetEventProcessor implements DecoratorProcessor {
  readonly metadataKey = METADATA_KEYS.NET_EVENT

  constructor(
    private playerService: PlayerService,
    private securityHandler: SecurityHandlerContract,
  ) {}

  process(target: any, methodName: string, metadata: NetEventOptions) {
    const handler = target[methodName].bind(target)
    const handlerName = `${target.constructor.name}.${methodName}`

    const isPublic = Reflect.getMetadata(METADATA_KEYS.PUBLIC, target, methodName) === true

    onNet(metadata.eventName, async (...args: any[]) => {
      const sourceId = Number(global.source)
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

      if (metadata.schema) {
        try {
          const payload = args[0]
          const parsed = metadata.schema.parse(payload)

          validatedArgs = [parsed]
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
        }
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
