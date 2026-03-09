import { inject, injectable } from 'tsyringe'
import { DecoratorProcessor } from '../../../../kernel/di/decorator-processor'
import { EventsAPI } from '../../../../adapters/contracts/transport/events.api'
import { coreLogger, LogDomain } from '../../../../kernel/logger'
import { METADATA_KEYS } from '../metadata-client.keys'

const clientNetEvent = coreLogger.child('NetEvent', LogDomain.CLIENT)

@injectable()
export class ClientNetEventProcessor implements DecoratorProcessor {
  readonly metadataKey = METADATA_KEYS.NET_EVENT

  constructor(@inject(EventsAPI as any) private readonly events: EventsAPI<'client'>) {}

  process(target: any, methodName: string, metadata: { eventName: string }) {
    const handler = target[methodName].bind(target)
    const handlerName = `${target.constructor.name}.${methodName}`

    this.events.on(metadata.eventName, async (_ctx, ...args: any[]) => {
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
