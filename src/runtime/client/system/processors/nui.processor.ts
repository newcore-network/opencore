import { injectable } from 'tsyringe'
import { DecoratorProcessor } from '../../../../kernel/di/decorator-processor'
import { loggers } from '../../../../kernel/shared/logger'
import { METADATA_KEYS } from '../metadata-client.keys'

@injectable()
export class NuiProcessor implements DecoratorProcessor {
  readonly metadataKey = METADATA_KEYS.NUI

  process(target: any, methodName: string, metadata: { eventName: string }) {
    const handler = target[methodName].bind(target)
    const handlerName = `${target.constructor.name}.${methodName}`

    RegisterNuiCallbackType(metadata.eventName)

    on(`__cfx_nui:${metadata.eventName}`, async (data: any, cb: Function) => {
      try {
        await handler(data)
        cb({ ok: true })
      } catch (error) {
        loggers.nui.error(
          `NUI callback error`,
          {
            event: metadata.eventName,
            handler: handlerName,
          },
          error as Error,
        )
        cb({ ok: false, error: String(error) })
      }
    })

    loggers.nui.debug(`Registered: ${metadata.eventName} -> ${handlerName}`)
  }
}
