import { inject, injectable } from 'tsyringe'
import { DecoratorProcessor } from '../../../../kernel/di/decorator-processor'
import { loggers } from '../../../../kernel/logger'
import { WebViewService } from '../../webview.service'
import { METADATA_KEYS } from '../metadata-client.keys'

@injectable()
export class ViewProcessor implements DecoratorProcessor {
  readonly metadataKey = METADATA_KEYS.VIEW

  constructor(@inject(WebViewService as any) private readonly webviews: WebViewService) {}

  process(target: any, methodName: string, metadata: { eventName: string }) {
    const handler = target[methodName].bind(target)
    const handlerName = `${target.constructor.name}.${methodName}`

    this.webviews.onMessage(async (message) => {
      if (message.event !== metadata.eventName) return
      try {
        await handler(message.payload)
      } catch (error) {
        loggers.webView.error(
          `WebView callback error`,
          {
            event: metadata.eventName,
            handler: handlerName,
          },
          error as Error,
        )
      }
    })

    loggers.webView.debug(`Registered WebView callback: ${metadata.eventName} -> ${handlerName}`)
  }
}
