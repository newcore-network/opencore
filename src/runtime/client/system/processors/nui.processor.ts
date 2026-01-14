import { injectable } from 'tsyringe'
import { DecoratorProcessor } from '../../../../kernel/di/decorator-processor'
import { loggers } from '../../../../kernel/logger'
import { METADATA_KEYS } from '../metadata-client.keys'

@injectable()
export class NuiProcessor implements DecoratorProcessor {
  readonly metadataKey = METADATA_KEYS.NUI

  process(target: any, methodName: string, metadata: { eventName: string }) {
    const handler = target[methodName].bind(target)
    const handlerName = `${target.constructor.name}.${methodName}`

    RegisterNuiCallbackType(metadata.eventName)

    on(`__cfx_nui:${metadata.eventName}`, async (data: any, cb: (response: unknown) => void) => {
      try {
        const result = await handler(data)
        cb({ ok: true, data: result })
      } catch (error) {
        loggers.nui.error(
          `NUI callback error`,
          {
            event: metadata.eventName,
            handler: handlerName,
          },
          error as Error,
        )
        const message = error instanceof Error ? error.message : String(error)
        cb({ ok: false, error: message })
      }
    })

    loggers.nui.debug(`Registered: ${metadata.eventName} -> ${handlerName}`)
  }
}
