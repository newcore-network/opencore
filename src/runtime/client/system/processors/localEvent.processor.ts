import { injectable } from 'tsyringe'
import { DecoratorProcessor } from '../../../../kernel/di/decorator-processor'
import { METADATA_KEYS } from '../metadata-client.keys'
import { coreLogger, LogDomain } from '../../../../kernel/shared/logger'

const clientLocalEvent = coreLogger.child('LocalEvent', LogDomain.CLIENT)

@injectable()
export class LocalEventProcessor implements DecoratorProcessor {
  readonly metadataKey = METADATA_KEYS.LOCAL_EVENT

  process(target: any, methodName: string, metadata: { eventName: string }) {
    const handler = target[methodName].bind(target)
    const handlerName = `${target.constructor.name}.${methodName}`

    on(metadata.eventName, async (...args: any[]) => {
      try {
        await handler(...args)
      } catch (error) {
        clientLocalEvent.error(
          `Handler error in local event`,
          {
            event: metadata.eventName,
            handler: handlerName,
          },
          error as Error,
        )
      }
    })

    clientLocalEvent.debug(`Registered: ${metadata.eventName} -> ${handlerName}`)
  }
}
