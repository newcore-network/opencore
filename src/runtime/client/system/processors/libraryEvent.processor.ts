import { injectable } from 'tsyringe'
import { DecoratorProcessor } from '../../../../kernel/di/decorator-processor'
import { coreLogger, LogDomain } from '../../../../kernel/logger'
import { onLibraryEvent } from '../../bus/library-event.bus'
import { LibraryEventDecoratorMetadata } from '../../decorators/onLibraryEvent'
import { METADATA_KEYS } from '../metadata-client.keys'

const clientLibraryEvent = coreLogger.child('LibraryEvent', LogDomain.CLIENT)

@injectable()
export class ClientLibraryEventProcessor implements DecoratorProcessor {
  readonly metadataKey = METADATA_KEYS.LIBRARY_EVENT

  process(target: any, methodName: string, metadata: LibraryEventDecoratorMetadata) {
    const handler = target[methodName].bind(target)
    const handlerName = `${target.constructor.name}.${methodName}`

    onLibraryEvent(metadata.eventId, async (event) => {
      try {
        await handler(event.payload, event.meta)
      } catch (error) {
        clientLibraryEvent.error(
          `Handler error in library event`,
          {
            eventId: metadata.eventId,
            libraryName: metadata.libraryName,
            eventName: metadata.eventName,
            handler: handlerName,
          },
          error as Error,
        )
      }
    })

    clientLibraryEvent.debug(`Registered: ${metadata.eventId} -> ${handlerName}`)
  }
}
