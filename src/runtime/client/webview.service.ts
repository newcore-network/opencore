import { injectable } from 'tsyringe'
import { coreLogger, LogDomain } from '../../kernel/logger'
import { IClientWebViewBridge } from '../../adapters/contracts/client/ui/webview/IClientWebViewBridge'
import { IClientRuntimeBridge } from './adapter/runtime-bridge'
import type {
  WebViewCapabilities,
  WebViewDefinition,
  WebViewFocusOptions,
  WebViewMessage,
} from '../../adapters/contracts/client/ui/webview/types'
import { di } from './client-container'

const webViewLogger = coreLogger.child('WebView', LogDomain.CLIENT)

const FALLBACK_CAPABILITIES: WebViewCapabilities = {
  supportsFocus: true,
  supportsCursor: true,
  supportsInputPassthrough: true,
  supportsBidirectionalMessaging: true,
  supportsExecute: false,
  supportsHeadless: false,
}

function createFallbackBridge(): IClientWebViewBridge {
  const runtime = di.resolve(IClientRuntimeBridge as any) as IClientRuntimeBridge
  const handlers = new Set<(message: WebViewMessage) => void | Promise<void>>()
  let registered = false

  return {
    getCapabilities: () => FALLBACK_CAPABILITIES,
    create: () => {},
    destroy: () => {},
    exists: () => true,
    show: () => {},
    hide: () => {},
    focus: (_viewId, options) => {
      runtime.setWebViewFocus(true, options?.cursor ?? true)
      runtime.setWebViewInputPassthrough(options?.inputPassthrough ?? false)
    },
    blur: () => runtime.setWebViewFocus(false, false),
    send: (viewId, event, payload) => {
      runtime.sendWebViewMessage(
        JSON.stringify({ __opencoreWebView: true, viewId, action: event, data: payload }),
      )
    },
    onMessage: (handler) => {
      if (!registered) {
        registered = true
        runtime.registerWebViewCallback('__opencore:webview:message', async (data: unknown, cb) => {
          const message = data as WebViewMessage
          for (const item of handlers) await item(message)
          cb({ ok: true })
        })
      }
      handlers.add(handler)
      return () => handlers.delete(handler)
    },
  }
}

@injectable()
export class WebViewService {
  private get bridge(): IClientWebViewBridge {
    if (di.isRegistered(IClientWebViewBridge as any)) {
      return di.resolve(IClientWebViewBridge as any) as IClientWebViewBridge
    }

    return createFallbackBridge()
  }

  getCapabilities(): WebViewCapabilities {
    return this.bridge.getCapabilities()
  }

  create(definition: WebViewDefinition): void {
    this.bridge.create(definition)
    webViewLogger.debug('Created webview', { id: definition.id, url: definition.url })
  }

  destroy(viewId: string): void {
    this.bridge.destroy(viewId)
    webViewLogger.debug('Destroyed webview', { id: viewId })
  }

  exists(viewId: string): boolean {
    return this.bridge.exists(viewId)
  }

  show(viewId: string): void {
    this.bridge.show(viewId)
  }
  hide(viewId: string): void {
    this.bridge.hide(viewId)
  }
  focus(viewId: string, options?: WebViewFocusOptions): void {
    this.bridge.focus(viewId, options)
  }
  blur(viewId: string): void {
    this.bridge.blur(viewId)
  }
  send(viewId: string, event: string, payload: unknown): void {
    this.bridge.send(viewId, event, payload)
  }
  onMessage(handler: (message: WebViewMessage) => void | Promise<void>): () => void {
    return this.bridge.onMessage(handler)
  }
}
