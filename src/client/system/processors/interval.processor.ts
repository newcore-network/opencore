import { injectable } from 'tsyringe'
import { DecoratorProcessor } from '../../../system/decorator-processor'
import { METADATA_KEYS } from '../metadata-client.keys'
import { coreLogger, LogDomain } from '../../../shared/logger'

const clientInterval = coreLogger.child('Interval', LogDomain.CLIENT)

@injectable()
export class IntervalProcessor implements DecoratorProcessor {
  readonly metadataKey = METADATA_KEYS.INTERVAL

  process(target: any, methodName: string, metadata: { interval: number }) {
    const handler = target[methodName].bind(target)
    const handlerName = `${target.constructor.name}.${methodName}`

    let lastRun = 0

    setTick(async () => {
      const now = GetGameTimer()
      if (now - lastRun < metadata.interval) return

      lastRun = now
      try {
        await handler()
      } catch (error) {
        clientInterval.error(
          `Interval handler error`,
          {
            handler: handlerName,
            interval: metadata.interval,
          },
          error as Error,
        )
      }
    })

    clientInterval.debug(`Registered: ${handlerName} (every ${metadata.interval}ms)`)
  }
}

