import { injectable } from 'tsyringe'
import { DecoratorProcessor } from '../../../../kernel/di/decorator-processor'
import { loggers } from '../../../../kernel/logger'
import { onLibraryEvent } from '../../bus/library-event.bus'
import { LibraryEventDecoratorMetadata } from '../../decorators/onLibraryEvent'
import { resolveMethod } from '../../helpers/resolve-method'
import { METADATA_KEYS } from '../metadata-server.keys'

@injectable()
export class LibraryEventProcessor implements DecoratorProcessor {
  readonly metadataKey = METADATA_KEYS.LIBRARY_EVENT

  process(instance: any, methodName: string, metadata: LibraryEventDecoratorMetadata) {
    const result = resolveMethod(
      instance,
      methodName,
      `[LibraryEventProcessor] Method "${methodName}" not found`,
    )
    if (!result) return

    const { handler, handlerName } = result

    onLibraryEvent(metadata.eventId, (event) => {
      try {
        return handler(event.payload, event.meta)
      } catch (error) {
        loggers.eventBus.error(
          `Handler error in LibraryEvent`,
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

    loggers.eventBus.debug(`Registered: ${metadata.eventId} -> ${handlerName}`)
  }
}
