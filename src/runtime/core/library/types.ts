/**
 * Unique name used to identify a library.
 */
export type LibraryName = string

/**
 * Namespace used to build external event names.
 *
 * @example
 * `opencore:characters`
 */
export type LibraryNamespace = string

/**
 * Internal or external event name segment.
 *
 * @example
 * `created`
 */
export type LibraryEventName = string

/**
 * Generic handler used by the internal library bus.
 */
export type LibraryEventHandler<TPayload = unknown> = (payload?: TPayload) => void

/**
 * Lightweight internal event bus for library-local communication.
 *
 * @remarks
 * This bus is pure TypeScript and does not use FiveM or network events.
 */
export interface LibraryBus {
  /**
   * Subscribe to an internal event.
   */
  on<TPayload = unknown>(event: LibraryEventName, handler: LibraryEventHandler<TPayload>): void

  /**
   * Subscribe to an internal event only once.
   */
  once<TPayload = unknown>(event: LibraryEventName, handler: LibraryEventHandler<TPayload>): void

  /**
   * Remove an internal event handler.
   */
  off<TPayload = unknown>(event: LibraryEventName, handler: LibraryEventHandler<TPayload>): void

  /**
   * Emit an internal event to handlers in this library.
   */
  emit<TPayload = unknown>(event: LibraryEventName, payload?: TPayload): void
}

/**
 * Shared base contract for OpenCore libraries.
 *
 * @remarks
 * Includes only library-local event operations and event name composition.
 * External bridge behavior is added by server/client wrappers.
 */
export interface OpenCoreLibraryBase extends LibraryBus {
  /**
   * Library identifier.
   */
  name: LibraryName

  /**
   * Event namespace used by the external bridge.
   */
  namespace: LibraryNamespace

  /**
   * Builds a namespaced external event name.
   *
   * @example
   * `opencore:characters:created`
   */
  buildEventName(eventName: LibraryEventName): string
}

/**
 * Minimal config accessor used by library wrappers.
 */
export interface OpenCoreLibraryConfigAccessor<TConfig = Record<string, unknown>> {
  /**
   * Namespace of the library config segment.
   */
  namespace: LibraryNamespace

  /**
   * Gets a value by key from the namespaced config source.
   */
  get<TKey extends keyof TConfig>(key: TKey): TConfig[TKey] | undefined
}

/**
 * Server library API.
 *
 * @remarks
 * Adds a FiveM-based external bridge on top of the internal library bus.
 */
export interface OpenCoreServerLibrary extends OpenCoreLibraryBase {
  side: 'server'
  emitExternal<TPayload = unknown>(eventName: LibraryEventName, payload?: TPayload): void
  emitNetExternal<TPayload = unknown>(eventName: LibraryEventName, target: number, payload?: TPayload): void
  getLogger(): {
    trace(message: string, context?: Record<string, unknown>): void
    debug(message: string, context?: Record<string, unknown>): void
    info(message: string, context?: Record<string, unknown>): void
    warn(message: string, context?: Record<string, unknown>): void
    error(message: string, context?: Record<string, unknown>, error?: Error): void
    fatal(message: string, context?: Record<string, unknown>, error?: Error): void
  }
  getConfig<TConfig = Record<string, unknown>>(): OpenCoreLibraryConfigAccessor<TConfig>
}

/**
 * Client library API.
 *
 * @remarks
 * Adds a client-to-server external bridge on top of the internal library bus.
 */
export interface OpenCoreClientLibrary extends OpenCoreLibraryBase {
  side: 'client'
  emitServer<TPayload = unknown>(eventName: LibraryEventName, payload?: TPayload): void
  getLogger(): {
    trace(message: string, context?: Record<string, unknown>): void
    debug(message: string, context?: Record<string, unknown>): void
    info(message: string, context?: Record<string, unknown>): void
    warn(message: string, context?: Record<string, unknown>): void
    error(message: string, context?: Record<string, unknown>, error?: Error): void
    fatal(message: string, context?: Record<string, unknown>, error?: Error): void
  }
  getConfig<TConfig = Record<string, unknown>>(): OpenCoreLibraryConfigAccessor<TConfig>
}
