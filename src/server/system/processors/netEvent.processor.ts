import { injectable } from 'tsyringe'
import { DecoratorProcessor } from '../../../system/decorator-processor'
import { PlayerService } from '../../services/player.service'
import { METADATA_KEYS } from '../metadata-server.keys'

@injectable()
export class NetEventProcessor implements DecoratorProcessor {
  readonly metadataKey = METADATA_KEYS.NET_EVENT

  constructor(private playerService: PlayerService) {}

  process(target: any, methodName: string, metadata: { eventName: string }) {
    const handler = target[methodName].bind(target)

    onNet(metadata.eventName, async (...args: any[]) => {
      const sourceId = Number(global.source)
      const player = this.playerService.getByClient(sourceId)

      if (!player) {
        return console.warn(
          `[Core] Event ${metadata.eventName} ignored: Player ${sourceId} not found.`,
        )
      }

      try {
        await handler(player, ...args)
      } catch (error) {
        console.error(`[Core] Error en NetEvent ${metadata.eventName}:`, error)
      }
    })

    console.log(
      `[Core] NetEvent registered: ${metadata.eventName} -> ${target.constructor.name}.${methodName}`,
    )
  }
}
