import { injectable } from 'tsyringe'
import { DecoratorProcessor } from '../../../../kernel/di/decorator-processor'
import { loggers } from '../../../../kernel/shared/logger'
import { onFrameworkEvent } from '../../bus/core-event-bus'
import { resolveMethod } from '../../helpers/resolve-method'
import { METADATA_KEYS } from '../metadata-server.keys'

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

    onFrameworkEvent(metadata.event as any, (payload) => {
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
