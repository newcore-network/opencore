import { injectable } from 'tsyringe'
import { DecoratorProcessor } from '../../../../kernel/di/decorator-processor'
import { loggers } from '../../../../kernel/shared/logger'
import { onFrameworkEvent } from '../../bus/internal-event.bus'
import { resolveMethod } from '../../helpers/resolve-method'
import { METADATA_KEYS } from '../metadata-server.keys'

@injectable()
export class InternalEventProcessor implements DecoratorProcessor {
  readonly metadataKey = METADATA_KEYS.INTERNAL_EVENT

  process(instance: any, methodName: string, metadata: { event: string }) {
    const result = resolveMethod(
      instance,
      methodName,
      `[InternalEventProcessor] Method "${methodName}" not found`,
    )
    if (!result) return

    const { handler, handlerName } = result

    onFrameworkEvent(metadata.event as any, (payload) => {
      try {
        handler(payload)
      } catch (error) {
        loggers.eventBus.error(
          `Handler error in InternalEvent`,
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
