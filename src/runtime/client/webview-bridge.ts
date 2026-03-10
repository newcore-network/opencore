import { injectable } from 'tsyringe'
import { coreLogger, LogDomain } from '../../kernel/logger'
import { di } from './client-container'
import { IClientRuntimeBridge } from './adapter/runtime-bridge'

const webViewLogger = coreLogger.child('WebView', LogDomain.CLIENT)

function createFallbackRuntimeBridge(): IClientRuntimeBridge {
  return {
    getCurrentResourceName: () => 'default',
    on: (eventName, handler) => {
      const onFn = (globalThis as any).on
      if (typeof onFn === 'function') {
        onFn(eventName, handler)
      }
    },
    registerCommand: (commandName, handler, restricted) => {
      const fn = (globalThis as any).RegisterCommand
      if (typeof fn === 'function') {
        fn(commandName, handler, restricted)
      }
    },
    registerKeyMapping: (commandName, description, inputMapper, key) => {
      const fn = (globalThis as any).RegisterKeyMapping
      if (typeof fn === 'function') {
        fn(commandName, description, inputMapper, key)
      }
    },
    setTick: (handler) => setInterval(() => void handler(), 0),
    clearTick: (handle) => clearInterval(handle as ReturnType<typeof setInterval>),
    getGameTimer: () => Date.now(),
    registerWebViewCallback(eventName, handler) {
      this.registerNuiCallback(eventName, handler)
    },
    sendWebViewMessage(message) {
      this.sendNuiMessage(message)
    },
    setWebViewFocus(hasFocus, hasCursor) {
      this.setNuiFocus(hasFocus, hasCursor)
    },
    setWebViewInputPassthrough(enabled) {
      this.setNuiFocusKeepInput(enabled)
    },
    registerNuiCallback: (eventName, handler) => {
      const registerType = (globalThis as any).RegisterNuiCallbackType
      const onFn = (globalThis as any).on
      if (typeof registerType === 'function') registerType(eventName)
      if (typeof onFn === 'function') onFn(`__cfx_nui:${eventName}`, handler)
    },
    sendNuiMessage: (message) => {
      const fn = (globalThis as any).SendNuiMessage
      if (typeof fn === 'function') fn(message)
    },
    setNuiFocus: (hasFocus, hasCursor) => {
      const fn = (globalThis as any).SetNuiFocus
      if (typeof fn === 'function') fn(hasFocus, hasCursor)
    },
    setNuiFocusKeepInput: (keepInput) => {
      const fn = (globalThis as any).SetNuiFocusKeepInput
      if (typeof fn === 'function') fn(keepInput)
    },
    registerExport: (exportName, exportHandler) => {
      const fn = (globalThis as any).exports
      if (typeof fn === 'function') fn(exportName, exportHandler)
    },
  }
}

function resolveRuntimeBridge(): IClientRuntimeBridge {
  if (di.isRegistered(IClientRuntimeBridge as any)) {
    return di.resolve(IClientRuntimeBridge as any) as IClientRuntimeBridge
  }

  return createFallbackRuntimeBridge()
}

/**
 * Type-safe bridge for embedded WebView communication.
 */
@injectable()
export class WebViewBridge<
  TSend extends Record<string, any> = Record<string, any>,
  TReceive extends Record<string, any> = Record<string, any>,
> {
  private _isVisible = false
  private _hasFocus = false
  private _hasCursor = false

  private get runtime(): IClientRuntimeBridge {
    return resolveRuntimeBridge()
  }

  get isVisible(): boolean {
    return this._isVisible
  }

  get hasFocus(): boolean {
    return this._hasFocus
  }

  get hasCursor(): boolean {
    return this._hasCursor
  }

  send<K extends keyof TSend & string>(action: K, data: TSend[K]): void {
    this.runtime.sendWebViewMessage(JSON.stringify({ action, data }))
    webViewLogger.debug(`Sent message: ${action}`)
  }

  sendRaw(action: string, data: any): void {
    this.runtime.sendWebViewMessage(JSON.stringify({ action, data }))
    webViewLogger.debug(`Sent raw message: ${action}`)
  }

  on<K extends keyof TReceive & string>(
    action: K,
    handler: (data: TReceive[K]) => void | Promise<void>,
  ): void {
    this.runtime.registerWebViewCallback(
      action,
      async (data: TReceive[K], cb: (resp: any) => void) => {
        try {
          await handler(data)
          cb({ ok: true })
        } catch (error) {
          webViewLogger.error(`WebView callback error`, { action }, error as Error)
          cb({ ok: false, error: String(error) })
        }
      },
    )

    webViewLogger.debug(`Registered callback: ${action}`)
  }

  onWithResponse<K extends keyof TReceive & string, R = any>(
    action: K,
    handler: (data: TReceive[K]) => R | Promise<R>,
  ): void {
    this.runtime.registerWebViewCallback(
      action,
      async (data: TReceive[K], cb: (resp: any) => void) => {
        try {
          const result = await handler(data)
          cb({ ok: true, data: result })
        } catch (error) {
          webViewLogger.error(`WebView callback error`, { action }, error as Error)
          cb({ ok: false, error: String(error) })
        }
      },
    )

    webViewLogger.debug(`Registered callback with response: ${action}`)
  }

  focus(hasFocus: boolean, hasCursor?: boolean): void {
    this._hasFocus = hasFocus
    this._hasCursor = hasCursor ?? hasFocus
    this.runtime.setWebViewFocus(this._hasFocus, this._hasCursor)
    webViewLogger.debug(`Focus set: focus=${this._hasFocus}, cursor=${this._hasCursor}`)
  }

  blur(): void {
    this.focus(false, false)
  }

  setVisible(visible: boolean): void {
    this._isVisible = visible
    this.send('setVisible' as any, { visible } as any)
    webViewLogger.debug(`Visibility set: ${visible}`)
  }

  show(withFocus = true, withCursor?: boolean): void {
    this.setVisible(true)
    if (withFocus) {
      this.focus(true, withCursor)
    }
  }

  hide(): void {
    this.setVisible(false)
    this.blur()
  }

  toggle(withFocus = true): void {
    if (this._isVisible) {
      this.hide()
      return
    }

    this.show(withFocus)
  }

  setInputPassthrough(enabled: boolean): void {
    this.runtime.setWebViewInputPassthrough(enabled)
    webViewLogger.debug(`Input passthrough set: ${enabled}`)
  }

  /**
   * @deprecated Use setInputPassthrough instead.
   */
  setKeepInput(keepInput: boolean): void {
    this.setInputPassthrough(keepInput)
  }
}

/**
 * @deprecated Use WebViewBridge instead.
 */
export class NuiBridge<
  TSend extends Record<string, any> = Record<string, any>,
  TReceive extends Record<string, any> = Record<string, any>,
> extends WebViewBridge<TSend, TReceive> {}

export const WebView = new WebViewBridge()

/**
 * @deprecated Use WebView instead.
 */
export const NUI = WebView
