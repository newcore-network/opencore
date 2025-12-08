import { injectable } from 'tsyringe'
import { DecoratorProcessor } from '../../../system/decorator-processor'
import { METADATA_KEYS } from '../metadata-server.keys'
import { loggers } from '../../../shared/logger'
import { resolveMethod } from '../../helpers/resolve-method'

@injectable()
export class FiveMEventProcessor implements DecoratorProcessor {
  readonly metadataKey = METADATA_KEYS.FIVEM_EVENT

  process(instance: any, methodName: string, metadata: { event: string }) {
    const result = resolveMethod(
      instance,
      methodName,
      `[FiveMEventProcessor] Method "${methodName}" not found`,
    )
    if (!result) return

    const { handler, handlerName } = result

    on(metadata.event, (...args: any[]) => {
      try {
        handler(...args)
      } catch (error) {
        loggers.eventBus.error(
          `Handler error in FiveMEvent`,
          {
            event: metadata.event,
            handler: handlerName,
          },
          error as Error,
        )
      }
    })

    loggers.eventBus.debug(`Registered FiveM event: ${metadata.event} -> ${handlerName}`)
  }
}
