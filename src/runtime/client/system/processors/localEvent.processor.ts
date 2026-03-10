import { inject, injectable } from 'tsyringe'
import { DecoratorProcessor } from '../../../../kernel/di/decorator-processor'
import { coreLogger, LogDomain } from '../../../../kernel/logger'
import { IClientRuntimeBridge } from '../../adapter/runtime-bridge'
import { METADATA_KEYS } from '../metadata-client.keys'

const clientLocalEvent = coreLogger.child('LocalEvent', LogDomain.CLIENT)

@injectable()
export class LocalEventProcessor implements DecoratorProcessor {
  readonly metadataKey = METADATA_KEYS.LOCAL_EVENT

  constructor(
    @inject(IClientRuntimeBridge as any) private readonly runtime: IClientRuntimeBridge,
  ) {}

  process(target: any, methodName: string, metadata: { eventName: string }) {
    const handler = target[methodName].bind(target)
    const handlerName = `${target.constructor.name}.${methodName}`

    this.runtime.on(metadata.eventName, async (...args: any[]) => {
      try {
        await handler(...args)
      } catch (error) {
        clientLocalEvent.error(
          `Handler error in local event`,
          {
            event: metadata.eventName,
            handler: handlerName,
          },
          error as Error,
        )
      }
    })

    clientLocalEvent.debug(`Registered: ${metadata.eventName} -> ${handlerName}`)
  }
}
