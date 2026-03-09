/**
 * Runtime bridge owned by the active client adapter.
 */
export abstract class IClientRuntimeBridge {
  abstract getCurrentResourceName(): string
  abstract on(eventName: string, handler: (...args: any[]) => void | Promise<void>): void
  abstract registerCommand(
    commandName: string,
    handler: (...args: any[]) => void,
    restricted: boolean,
  ): void
  abstract registerKeyMapping(
    commandName: string,
    description: string,
    inputMapper: string,
    key: string,
  ): void
  abstract setTick(handler: () => void | Promise<void>): unknown
  abstract clearTick(handle: unknown): void
  abstract getGameTimer(): number

  /**
   * Registers a callback exposed to the embedded WebView layer.
   */
  registerWebViewCallback(
    eventName: string,
    handler: (data: any, cb: (response: unknown) => void) => void | Promise<void>,
  ): void {
    this.registerNuiCallback(eventName, handler)
  }

  /**
   * Sends a message to the embedded WebView layer.
   */
  sendWebViewMessage(message: string): void {
    this.sendNuiMessage(message)
  }

  /**
   * Sets WebView focus state when supported by the runtime.
   */
  setWebViewFocus(hasFocus: boolean, hasCursor: boolean): void {
    this.setNuiFocus(hasFocus, hasCursor)
  }

  /**
   * Keeps game input enabled while the WebView is focused.
   */
  setWebViewInputPassthrough(enabled: boolean): void {
    this.setNuiFocusKeepInput(enabled)
  }

  /**
   * @deprecated Use registerWebViewCallback instead.
   */
  abstract registerNuiCallback(
    eventName: string,
    handler: (data: any, cb: (response: unknown) => void) => void | Promise<void>,
  ): void

  /**
   * @deprecated Use sendWebViewMessage instead.
   */
  abstract sendNuiMessage(message: string): void

  /**
   * @deprecated Use setWebViewFocus instead.
   */
  abstract setNuiFocus(hasFocus: boolean, hasCursor: boolean): void

  /**
   * @deprecated Use setWebViewInputPassthrough instead.
   */
  abstract setNuiFocusKeepInput(keepInput: boolean): void
  abstract registerExport(exportName: string, handler: (...args: any[]) => any): void
}
