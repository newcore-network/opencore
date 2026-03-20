import type {
  WebViewCapabilities,
  WebViewDefinition,
  WebViewFocusOptions,
  WebViewMessage,
} from './types'

export abstract class IClientWebViewBridge {
  abstract getCapabilities(): WebViewCapabilities
  abstract create(definition: WebViewDefinition): void
  abstract destroy(viewId: string): void
  abstract exists(viewId: string): boolean
  abstract show(viewId: string): void
  abstract hide(viewId: string): void
  abstract focus(viewId: string, options?: WebViewFocusOptions): void
  abstract blur(viewId: string): void
  abstract markAsChat(viewId: string): void
  abstract send(viewId: string, event: string, payload: unknown): void
  abstract onMessage(handler: (message: WebViewMessage) => void | Promise<void>): () => void
}
