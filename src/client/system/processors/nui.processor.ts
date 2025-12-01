import { injectable } from 'tsyringe'
import { DecoratorProcessor } from '../../../system/decorator-processor'
import { METADATA_KEYS } from '../metadata-client.keys'

@injectable()
export class NuiProcessor implements DecoratorProcessor {
  readonly metadataKey = METADATA_KEYS.NUI

  process(target: any, methodName: string, metadata: { eventName: string }) {
    const handler = target[methodName].bind(target)

    RegisterNuiCallbackType(metadata.eventName)

    on(`__cfx_nui:${metadata.eventName}`, async (data: any, cb: Function) => {
      try {
        await handler(data)
        cb({ ok: true })
      } catch (error) {
        console.error(`[Client] NUI Error (${metadata.eventName}):`, error)
        cb({ ok: false, error: String(error) })
      }
    })
  }
}
