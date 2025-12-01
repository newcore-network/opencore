import { injectable } from 'tsyringe'
import { DecoratorProcessor } from '../../../system/decorator-processor'
import { METADATA_KEYS } from '../metadata-client.keys'

@injectable()
export class ClientNetEventProcessor implements DecoratorProcessor {
  readonly metadataKey = METADATA_KEYS.NET_EVENT

  process(target: any, methodName: string, metadata: { eventName: string }) {
    const handler = target[methodName].bind(target)

    onNet(metadata.eventName, async (...args: any[]) => {
      try {
        await handler(...args)
      } catch (error) {
        console.error(`[Client] Error in NetEvent ${metadata.eventName}:`, error)
      }
    })
  }
}
