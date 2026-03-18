import { DEFAULT_RUNTIME_EVENT_MAP, type RuntimeEventMap, type RuntimeEventName } from './runtime'

export abstract class IEngineEvents {
  /**
   * Registers a handler for a local (server-side) event.
   *
   * @param eventName - The event name to listen for
   * @param handler - The callback to invoke when the event is emitted
   */
  abstract on(eventName: string, handler?: (...args: any[]) => void): void

  onRuntime(eventName: RuntimeEventName, handler?: (...args: any[]) => void): void {
    this.on(this.getRuntimeEventMap()[eventName] ?? eventName, handler)
  }

  getRuntimeEventMap(): RuntimeEventMap {
    return DEFAULT_RUNTIME_EVENT_MAP
  }

  /**
   * Emits a local event.
   *
   * @remarks
   * This is for server-to-server communication (between resources).
   * For client-server communication, use EventsAPI instead.
   *
   * @param eventName - The event name to emit
   * @param args - Arguments to pass to event handlers
   */
  abstract emit(eventName: string, ...args: any[]): void
}
