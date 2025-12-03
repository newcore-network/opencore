import { injectable } from 'tsyringe'
import { DecoratorProcessor } from '../../../system/decorator-processor'
import { METADATA_KEYS } from '../metadata-server.keys'
import { loggers } from '../../../shared/logger'

@injectable()
export class TickProcessor implements DecoratorProcessor {
  readonly metadataKey = METADATA_KEYS.TICK

  process(target: any, methodName: string) {
    const handler = target[methodName].bind(target)
    const handlerName = `${target.constructor.name}.${methodName}`

    setTick(async () => {
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
