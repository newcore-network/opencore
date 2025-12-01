import { injectable } from 'tsyringe'
import { DecoratorProcessor } from '../../../system/decorator-processor'
import { onCoreEvent } from '../../bus/core-event-bus'
import { METADATA_KEYS } from '../metadata-server.keys'

@injectable()
export class CoreEventProcessor implements DecoratorProcessor {
  readonly metadataKey = METADATA_KEYS.CORE_EVENT

  process(target: any, methodName: string, metadata: { event: string }) {
    const handler = target[methodName].bind(target)

    onCoreEvent(metadata.event as any, (payload) => {
      try {
        handler(payload)
      } catch (e) {
        console.error(`[Core] Error in CoreEvent ${metadata.event}:`, e)
      }
    })
  }
}
