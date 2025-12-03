import { injectable } from 'tsyringe'
import { DecoratorProcessor } from '../../../system/decorator-processor'
import { onCoreEvent } from '../../bus/core-event-bus'
import { METADATA_KEYS } from '../metadata-server.keys'
import { loggers } from '../../../shared/logger'

@injectable()
export class CoreEventProcessor implements DecoratorProcessor {
  readonly metadataKey = METADATA_KEYS.CORE_EVENT

  process(target: any, methodName: string, metadata: { event: string }) {
    const handler = target[methodName].bind(target)
    const handlerName = `${target.constructor.name}.${methodName}`

    onCoreEvent(metadata.event as any, (payload) => {
      try {
        handler(payload)
      } catch (error) {
        loggers.eventBus.error(
          `Handler error in CoreEvent`,
          {
            event: metadata.event,
            handler: handlerName,
          },
          error as Error,
        )
      }
    })

    loggers.eventBus.debug(`Registered: ${metadata.event} -> ${handlerName}`)
  }
}
