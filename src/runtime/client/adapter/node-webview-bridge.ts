import { injectable } from 'tsyringe'
import { IClientWebViewBridge } from '../../../adapters/contracts/client/ui/webview/IClientWebViewBridge'
import type {
  WebViewCapabilities,
  WebViewDefinition,
  WebViewFocusOptions,
  WebViewMessage,
} from '../../../adapters/contracts/client/ui/webview/types'

const NODE_WEBVIEW_CAPABILITIES: WebViewCapabilities = {
  supportsFocus: false,
  supportsCursor: false,
  supportsInputPassthrough: false,
  supportsBidirectionalMessaging: false,
  supportsExecute: false,
  supportsHeadless: false,
  supportsChatMode: false,
}

@injectable()
export class NodeClientWebViewBridge extends IClientWebViewBridge {
  private readonly views = new Set<string>()
  getCapabilities(): WebViewCapabilities {
    return NODE_WEBVIEW_CAPABILITIES
  }
  create(definition: WebViewDefinition): void {
    this.views.add(definition.id)
  }
  destroy(viewId: string): void {
    this.views.delete(viewId)
  }
  exists(viewId: string): boolean {
    return this.views.has(viewId)
  }
  show(_viewId: string): void {}
  hide(_viewId: string): void {}
  focus(_viewId: string, _options?: WebViewFocusOptions): void {}
  blur(_viewId: string): void {}
  markAsChat(_viewId: string): void {}
  send(_viewId: string, _event: string, _payload: unknown): void {}
  onMessage(_handler: (message: WebViewMessage) => void | Promise<void>): () => void {
    return () => {}
  }
}
