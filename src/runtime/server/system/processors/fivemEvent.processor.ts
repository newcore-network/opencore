import { inject, injectable } from 'tsyringe'
import { IEngineEvents } from '../../../../adapters/contracts/IEngineEvents'
import { type DecoratorProcessor } from '../../../../kernel/di/index'
import { loggers } from '../../../../kernel/shared/logger'
import { resolveMethod } from '../../helpers/resolve-method'
import { METADATA_KEYS } from '../metadata-server.keys'

@injectable()
export class FiveMEventProcessor implements DecoratorProcessor {
  readonly metadataKey = METADATA_KEYS.FIVEM_EVENT
  constructor(@inject(IEngineEvents as any) private readonly engineEvents: IEngineEvents) {}

  process(instance: any, methodName: string, metadata: { event: string }) {
    const result = resolveMethod(
      instance,
      methodName,
      `[FiveMEventProcessor] Method "${methodName}" not found`,
    )
    if (!result) return

    const { handler, handlerName } = result

    this.engineEvents.on(metadata.event, (...args: any[]) => {
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
