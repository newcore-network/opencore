import { DEFAULT_RUNTIME_EVENT_MAP, type RuntimeEventMap, type RuntimeEventName } from './runtime'

export abstract class IEngineEvents {
  /**
   * Registers a handler for a local (server-side) event.
   *
   * @param eventName - The event name to listen for
   * @param handler - The callback to invoke when the event is emitted
   */
  abstract on<TArgs extends readonly unknown[]>(
    eventName: string,
    handler?: (...args: TArgs) => void,
  ): void

  onRuntime<TArgs extends readonly unknown[]>(
    eventName: RuntimeEventName,
    handler?: (...args: TArgs) => void,
  ): void {
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
  abstract emit<TArgs extends readonly unknown[]>(eventName: string, ...args: TArgs): void
}
