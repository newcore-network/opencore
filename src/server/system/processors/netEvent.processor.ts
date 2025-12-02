import { injectable } from 'tsyringe'
import { DecoratorProcessor } from '../../../system/decorator-processor'
import { PlayerService } from '../../services/player.service'
import { METADATA_KEYS } from '../metadata-server.keys'
import { NetEventOptions } from '../../decorators'
import { SecurityHandlerContract } from '../../templates/security/security-handler.contract'
import { SecurityError } from '../../../utils'
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

    onNet(metadata.eventName, async (...args: any[]) => {
      const sourceId = Number(global.source)
      const player = this.playerService.getByClient(sourceId)

      if (!player) {
        return console.warn(
          `[Core] Event ${metadata.eventName} ignored: Player ${sourceId} not found.`,
        )
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
          console.error(`[Core] Error in ${metadata.eventName}:`, error)
        }
      }

      try {
        await handler(player, ...validatedArgs)
      } catch (error) {
        if (error instanceof SecurityError) {
          this.securityHandler.handleViolation(player, error)
        }
        console.error(`[Core] Error in NetEvent ${metadata.eventName}:`, error)
      }
    })

    console.log(
      `[Core] NetEvent registered: ${metadata.eventName} -> ${target.constructor.name}.${methodName}`,
    )
  }
}
