import { injectable } from 'tsyringe'
import { WebViewService } from './webview.service'
import type { WebViewFocusOptions } from '../../adapters/contracts/client/ui/webview/types'
import { di } from './client-container'

@injectable()
export class WebViewBridge<
  TSend extends Record<string, any> = Record<string, any>,
  TReceive extends Record<string, any> = Record<string, any>,
> {
  constructor(
    private readonly serviceResolver: WebViewService | (() => WebViewService),
    private readonly viewId = 'default',
  ) {}

  private get service(): WebViewService {
    return typeof this.serviceResolver === 'function'
      ? this.serviceResolver()
      : this.serviceResolver
  }

  create(url: string, options: { visible?: boolean; focused?: boolean; cursor?: boolean; inputPassthrough?: boolean } = {}): void {
    this.service.create({ id: this.viewId, url, ...options })
  }

  destroy(): void { this.service.destroy(this.viewId) }
  exists(): boolean { return this.service.exists(this.viewId) }

  send<K extends keyof TSend & string>(action: K, data: TSend[K]): void {
    this.service.send(this.viewId, action, data)
  }

  sendRaw(action: string, data: unknown): void {
    this.service.send(this.viewId, action, data)
  }

  on<K extends keyof TReceive & string>(
    action: K,
    handler: (data: TReceive[K]) => void | Promise<void>,
  ): () => void {
    return this.service.onMessage(async (message) => {
      if (message.viewId !== this.viewId || message.event !== action) return
      await handler(message.payload as TReceive[K])
    })
  }

  onWithResponse<K extends keyof TReceive & string, R = unknown>(
    action: K,
    handler: (data: TReceive[K]) => R | Promise<R>,
  ): () => void {
    return this.on(action, handler as (data: TReceive[K]) => void | Promise<void>)
  }

  focus(hasFocus: boolean, hasCursor?: boolean): void {
    if (hasFocus) {
      const options: WebViewFocusOptions = { cursor: hasCursor ?? true }
      this.service.focus(this.viewId, options)
      return
    }
    this.service.blur(this.viewId)
  }

  blur(): void { this.service.blur(this.viewId) }
  setVisible(visible: boolean): void { visible ? this.service.show(this.viewId) : this.service.hide(this.viewId) }
  show(withFocus = true, withCursor?: boolean): void {
    this.service.show(this.viewId)
    if (withFocus) this.focus(true, withCursor)
  }
  hide(): void {
    this.service.hide(this.viewId)
    this.blur()
  }
  toggle(withFocus = true): void {
    if (this.exists()) this.hide()
    else this.show(withFocus)
  }
  setInputPassthrough(enabled: boolean): void {
    this.service.focus(this.viewId, { inputPassthrough: enabled, cursor: true })
  }
  setKeepInput(keepInput: boolean): void { this.setInputPassthrough(keepInput) }
}

export class NuiBridge<
  TSend extends Record<string, any> = Record<string, any>,
  TReceive extends Record<string, any> = Record<string, any>,
> extends WebViewBridge<TSend, TReceive> {}

function resolveWebViewService(): WebViewService {
  return di.resolve(WebViewService)
}

export const WebView = new WebViewBridge(resolveWebViewService)
export const NUI = WebView
