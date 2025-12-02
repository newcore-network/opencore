import { injectable } from 'tsyringe'
import { DecoratorProcessor } from '../../../system/decorator-processor'
import { PlayerService } from '../../services/player.service'
import { METADATA_KEYS } from '../metadata-server.keys'
import { NetEventOptions } from '../../decorators'

@injectable()
export class NetEventProcessor implements DecoratorProcessor {
  readonly metadataKey = METADATA_KEYS.NET_EVENT

  constructor(private playerService: PlayerService) {}

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
          player.kick('Invalid data sent to server.')
          console.error(
            `[Security] Validation failed for ${metadata.eventName} from ID ${sourceId}:`,
            error,
          )
          return
        }
      }

      try {
        await handler(player, ...validatedArgs)
      } catch (error) {
        console.error(`[Core] Error in NetEvent ${metadata.eventName}:`, error)
      }
    })

    console.log(
      `[Core] NetEvent registered: ${metadata.eventName} -> ${target.constructor.name}.${methodName}`,
    )
  }
}
