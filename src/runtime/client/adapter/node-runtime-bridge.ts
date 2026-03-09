import { EventEmitter } from 'node:events'
import { injectable } from 'tsyringe'
import { IClientRuntimeBridge } from './runtime-bridge'

/**
 * Node fallback runtime bridge used in tests and standalone execution.
 */
@injectable()
export class NodeClientRuntimeBridge extends IClientRuntimeBridge {
  private readonly events = new EventEmitter()
  private readonly tickHandles = new Set<ReturnType<typeof setInterval>>()

  getCurrentResourceName(): string {
    return process.env.RESOURCE_NAME || 'default'
  }

  on(eventName: string, handler: (...args: any[]) => void | Promise<void>): void {
    this.events.on(eventName, (...args) => {
      void handler(...args)
    })
  }

  registerCommand(
    _commandName: string,
    _handler: (...args: any[]) => void,
    _restricted: boolean,
  ): void {}

  registerKeyMapping(
    _commandName: string,
    _description: string,
    _inputMapper: string,
    _key: string,
  ): void {}

  setTick(handler: () => void | Promise<void>): unknown {
    const tick = setInterval(() => {
      void handler()
    }, 0)
    this.tickHandles.add(tick)
    return tick
  }

  clearTick(handle: unknown): void {
    if (handle && this.tickHandles.has(handle as ReturnType<typeof setInterval>)) {
      clearInterval(handle as ReturnType<typeof setInterval>)
      this.tickHandles.delete(handle as ReturnType<typeof setInterval>)
    }
  }

  getGameTimer(): number {
    return Date.now()
  }

  registerNuiCallback(
    eventName: string,
    handler: (data: any, cb: (response: unknown) => void) => void | Promise<void>,
  ): void {
    this.events.on(`__nui:${eventName}`, (data, cb) => {
      void handler(data, cb)
    })
  }

  sendNuiMessage(_message: string): void {}

  setNuiFocus(_hasFocus: boolean, _hasCursor: boolean): void {}

  setNuiFocusKeepInput(_keepInput: boolean): void {}

  registerExport(exportName: string, handler: (...args: any[]) => any): void {
    ;(globalThis as Record<string, unknown>)[`__client_export:${exportName}`] = handler
  }
}
