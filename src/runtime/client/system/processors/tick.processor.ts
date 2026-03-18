import { inject, injectable } from 'tsyringe'
import { DecoratorProcessor } from '../../../../kernel/di/decorator-processor'
import { coreLogger, LogDomain } from '../../../../kernel/logger'
import { IClientRuntimeBridge } from '../../adapter/runtime-bridge'
import { METADATA_KEYS } from '../metadata-client.keys'

const clientTick = coreLogger.child('Tick', LogDomain.CLIENT)

@injectable()
export class TickProcessor implements DecoratorProcessor {
  readonly metadataKey = METADATA_KEYS.TICK

  constructor(
    @inject(IClientRuntimeBridge as any) private readonly runtime: IClientRuntimeBridge,
  ) {}

  process(target: any, methodName: string) {
    const handler = target[methodName].bind(target)
    const handlerName = `${target.constructor.name}.${methodName}`

    this.runtime.setTick(async () => {
      try {
        await handler()
      } catch (error) {
        clientTick.error(
          `Tick handler error`,
          {
            handler: handlerName,
          },
          error as Error,
        )
      }
    })

    clientTick.debug(`Registered: ${handlerName}`)
  }
}
