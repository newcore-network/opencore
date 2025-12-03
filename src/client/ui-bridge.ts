import { injectable } from 'tsyringe'
import { coreLogger, LogDomain } from '../shared/logger'

const nuiLogger = coreLogger.child('NUI', LogDomain.CLIENT)

/**
 * Type-safe NUI (Native UI) Bridge for client-server communication.
 *
 * Generic types allow for full type safety when sending/receiving messages.
 * Define your event maps and pass them as type parameters.
 *
 * @example
 * ```typescript
 * interface ClientToUI {
 *   'showMenu': { items: string[] }
 *   'hideMenu': void
 * }
 *
 * interface UIToClient {
 *   'menuItemSelected': { index: number }
 *   'menuClosed': void
 * }
 *
 * const nui = new NuiBridge<ClientToUI, UIToClient>()
 * nui.send('showMenu', { items: ['Option 1', 'Option 2'] })
 * nui.on('menuItemSelected', async (data) => console.log(data.index))
 * ```
 */
@injectable()
export class NuiBridge<
  TSend extends Record<string, any> = Record<string, any>,
  TReceive extends Record<string, any> = Record<string, any>,
> {
  private _isVisible = false
  private _hasFocus = false
  private _hasCursor = false

  /**
   * Whether the NUI frame is currently visible
   */
  get isVisible(): boolean {
    return this._isVisible
  }

  /**
   * Whether the NUI has input focus
   */
  get hasFocus(): boolean {
    return this._hasFocus
  }

  /**
   * Whether the cursor is visible
   */
  get hasCursor(): boolean {
    return this._hasCursor
  }

  /**
   * Send a message to the NUI (UI frame).
   *
   * @param action - The action/event name
   * @param data - The data payload
   */
  send<K extends keyof TSend & string>(action: K, data: TSend[K]): void {
    SendNuiMessage(JSON.stringify({ action, data }))
    nuiLogger.debug(`Sent message: ${action}`)
  }

  /**
   * Send a raw message to the NUI without type checking.
   *
   * @param action - The action/event name
   * @param data - The data payload
   */
  sendRaw(action: string, data: any): void {
    SendNuiMessage(JSON.stringify({ action, data }))
    nuiLogger.debug(`Sent raw message: ${action}`)
  }

  /**
   * Register a callback for NUI events from the UI.
   *
   * @param action - The action/event name to listen for
   * @param handler - The callback handler
   * @returns Cleanup function to unregister the callback
   */
  on<K extends keyof TReceive & string>(
    action: K,
    handler: (data: TReceive[K]) => void | Promise<void>,
  ): void {
    RegisterNuiCallbackType(action)

    on(`__cfx_nui:${action}`, async (data: TReceive[K], cb: (resp: any) => void) => {
      try {
        await handler(data)
        cb({ ok: true })
      } catch (error) {
        nuiLogger.error(`NUI callback error`, { action }, error as Error)
        cb({ ok: false, error: String(error) })
      }
    })

    nuiLogger.debug(`Registered callback: ${action}`)
  }

  /**
   * Register a callback that expects a return value.
   *
   * @param action - The action/event name to listen for
   * @param handler - The callback handler that returns data
   */
  onWithResponse<K extends keyof TReceive & string, R = any>(
    action: K,
    handler: (data: TReceive[K]) => R | Promise<R>,
  ): void {
    RegisterNuiCallbackType(action)

    on(`__cfx_nui:${action}`, async (data: TReceive[K], cb: (resp: any) => void) => {
      try {
        const result = await handler(data)
        cb({ ok: true, data: result })
      } catch (error) {
        nuiLogger.error(`NUI callback error`, { action }, error as Error)
        cb({ ok: false, error: String(error) })
      }
    })

    nuiLogger.debug(`Registered callback with response: ${action}`)
  }

  /**
   * Set NUI focus state.
   *
   * @param hasFocus - Whether the NUI should have input focus
   * @param hasCursor - Whether to show the cursor (defaults to hasFocus value)
   */
  focus(hasFocus: boolean, hasCursor?: boolean): void {
    this._hasFocus = hasFocus
    this._hasCursor = hasCursor ?? hasFocus
    SetNuiFocus(this._hasFocus, this._hasCursor)
    nuiLogger.debug(`Focus set: focus=${this._hasFocus}, cursor=${this._hasCursor}`)
  }

  /**
   * Remove NUI focus (convenience method).
   */
  blur(): void {
    this.focus(false, false)
  }

  /**
   * Set NUI visibility state.
   * Note: This only tracks state, you need to handle actual visibility in your UI.
   *
   * @param visible - Whether the NUI should be visible
   */
  setVisible(visible: boolean): void {
    this._isVisible = visible
    this.send('setVisible' as any, { visible } as any)
    nuiLogger.debug(`Visibility set: ${visible}`)
  }

  /**
   * Show the NUI and optionally set focus.
   *
   * @param withFocus - Whether to also set focus
   * @param withCursor - Whether to show cursor (defaults to withFocus)
   */
  show(withFocus = true, withCursor?: boolean): void {
    this.setVisible(true)
    if (withFocus) {
      this.focus(true, withCursor)
    }
  }

  /**
   * Hide the NUI and remove focus.
   */
  hide(): void {
    this.setVisible(false)
    this.blur()
  }

  /**
   * Toggle NUI visibility.
   *
   * @param withFocus - Whether to set focus when showing
   */
  toggle(withFocus = true): void {
    if (this._isVisible) {
      this.hide()
    } else {
      this.show(withFocus)
    }
  }

  /**
   * Keep input focus but allow game input.
   * Useful for HUDs that need to capture some keys but not all.
   *
   * @param keepInput - Whether to keep game input enabled
   */
  setKeepInput(keepInput: boolean): void {
    SetNuiFocusKeepInput(keepInput)
    nuiLogger.debug(`Keep input set: ${keepInput}`)
  }
}

/**
 * Default untyped NUI instance for quick usage.
 * For type-safe usage, create your own instance with proper generics.
 */
export const NUI = new NuiBridge()
