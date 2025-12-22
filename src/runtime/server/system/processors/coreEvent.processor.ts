import { injectable } from 'tsyringe'
import { DecoratorProcessor } from '../../../../kernel/di/decorator-processor'
import { onCoreEvent } from '../../bus/core-event-bus'
import { METADATA_KEYS } from '../metadata-server.keys'
import { loggers } from '../../../../kernel/shared/logger'
import { resolveMethod } from '../../helpers/resolve-method'

@injectable()
export class CoreEventProcessor implements DecoratorProcessor {
  readonly metadataKey = METADATA_KEYS.CORE_EVENT

  process(instance: any, methodName: string, metadata: { event: string }) {
    const result = resolveMethod(
      instance,
      methodName,
      `[CoreEventProcessor] Method "${methodName}" not found`,
    )
    if (!result) return

    const { handler, handlerName } = result

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
