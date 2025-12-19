import { injectable, inject } from 'tsyringe'
import { DecoratorProcessor } from '../../../system/decorator-processor'
import { METADATA_KEYS } from '../metadata-server.keys'
import { loggers } from '../../../shared/logger'
import { ITick } from '../../capabilities/ITick'

@injectable()
export class TickProcessor implements DecoratorProcessor {
  readonly metadataKey = METADATA_KEYS.TICK

  constructor(@inject(ITick as any) private tickService: ITick) {}

  process(target: any, methodName: string) {
    const handler = target[methodName].bind(target)
    const handlerName = `${target.constructor.name}.${methodName}`

    this.tickService.setTick(async () => {
      try {
        await handler()
      } catch (error) {
        loggers.tick.error(
          `Tick handler error`,
          {
            handler: handlerName,
          },
          error as Error,
        )
      }
    })

    loggers.tick.debug(`Registered: ${handlerName}`)
  }
}
