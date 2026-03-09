import { inject, injectable } from 'tsyringe'
import { DecoratorProcessor } from '../../../../kernel/di/decorator-processor'
import { coreLogger, LogDomain } from '../../../../kernel/logger'
import { IClientRuntimeBridge } from '../../adapter/runtime-bridge'
import { METADATA_KEYS } from '../metadata-client.keys'

const clientInterval = coreLogger.child('Interval', LogDomain.CLIENT)

@injectable()
export class IntervalProcessor implements DecoratorProcessor {
  readonly metadataKey = METADATA_KEYS.INTERVAL

  constructor(@inject(IClientRuntimeBridge as any) private readonly runtime: IClientRuntimeBridge) {}

  process(target: any, methodName: string, metadata: { interval: number }) {
    const handler = target[methodName].bind(target)
    const handlerName = `${target.constructor.name}.${methodName}`

    let lastRun = 0

    this.runtime.setTick(async () => {
      const now = this.runtime.getGameTimer()
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
