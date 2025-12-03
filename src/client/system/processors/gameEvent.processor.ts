import { injectable } from 'tsyringe'
import { DecoratorProcessor } from '../../../system/decorator-processor'
import { METADATA_KEYS } from '../metadata-client.keys'
import { coreLogger, LogDomain } from '../../../shared/logger'

const clientGameEvent = coreLogger.child('GameEvent', LogDomain.CLIENT)

@injectable()
export class GameEventProcessor implements DecoratorProcessor {
  readonly metadataKey = METADATA_KEYS.GAME_EVENT

  process(target: any, methodName: string, metadata: { eventName: string }) {
    const handler = target[methodName].bind(target)
    const handlerName = `${target.constructor.name}.${methodName}`

    on('gameEventTriggered', async (name: string, args: any[]) => {
      if (name !== metadata.eventName) return

      try {
        await handler(args)
      } catch (error) {
        clientGameEvent.error(
          `Game event handler error`,
          {
            event: metadata.eventName,
            handler: handlerName,
          },
          error as Error,
        )
      }
    })

    clientGameEvent.debug(`Registered game event: ${metadata.eventName} -> ${handlerName}`)
  }
}

