import { injectable } from 'tsyringe'
import { DecoratorProcessor } from '../../../../kernel/di/decorator-processor'
import { METADATA_KEYS } from '../metadata-client.keys'
import { coreLogger, LogDomain } from '../../../../kernel/shared/logger'

const clientNetEvent = coreLogger.child('NetEvent', LogDomain.CLIENT)

@injectable()
export class ClientNetEventProcessor implements DecoratorProcessor {
  readonly metadataKey = METADATA_KEYS.NET_EVENT

  process(target: any, methodName: string, metadata: { eventName: string }) {
    const handler = target[methodName].bind(target)
    const handlerName = `${target.constructor.name}.${methodName}`

    onNet(metadata.eventName, async (...args: any[]) => {
      try {
        await handler(...args)
      } catch (error) {
        clientNetEvent.error(
          `Handler error in event`,
          {
            event: metadata.eventName,
            handler: handlerName,
          },
          error as Error,
        )
      }
    })

    clientNetEvent.debug(`Registered: ${metadata.eventName} -> ${handlerName}`)
  }
}
