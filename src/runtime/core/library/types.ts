import type {
  ClientLibraryEvents,
  LibraryEventNameOf,
  LibraryEventsOf,
  LibraryPayloadOf,
  LooseLibraryEventMap,
  ServerLibraryEvents,
} from '../../shared/types/register'

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
 * Canonical library event identifier.
 *
 * @example
 * `characters:session:created`
 */
export type LibraryEventId = string

/**
 * Generic handler used by the internal library bus.
 */
export type LibraryEventHandler<TPayload = unknown> = (payload?: TPayload) => void

/**
 * Metadata attached to runtime library event notifications.
 */
export interface LibraryEventMetadata {
  libraryName: LibraryName
  eventName: LibraryEventName
  eventId: LibraryEventId
  namespace: LibraryNamespace
  side: 'server' | 'client'
}

/**
 * Runtime notification envelope emitted by library wrappers.
 */
export interface LibraryEventEnvelope<TPayload = unknown> {
  payload?: TPayload
  meta: LibraryEventMetadata
}

/**
 * Lightweight internal event bus for library-local communication.
 *
 * @remarks
 * This bus is pure TypeScript and does not use FiveM or network events.
 *
 * `M` maps each event name to its payload. When typegen registered the library, names
 * autocomplete (and, in strict mode, are checked) and payloads are those of its
 * `@OnLibraryEvent` listeners. Otherwise `M` is loose and every method keeps inferring the
 * payload from `TPayload`, exactly as before.
 */
export interface LibraryBus<M = LooseLibraryEventMap> {
  /**
   * Subscribe to an internal event.
   */
  on<TPayload = unknown, K extends LibraryEventNameOf<M> = LibraryEventNameOf<M>>(
    event: K,
    handler: LibraryEventHandler<LibraryPayloadOf<M, K, TPayload>>,
  ): void

  /**
   * Subscribe to an internal event only once.
   */
  once<TPayload = unknown, K extends LibraryEventNameOf<M> = LibraryEventNameOf<M>>(
    event: K,
    handler: LibraryEventHandler<LibraryPayloadOf<M, K, TPayload>>,
  ): void

  /**
   * Remove an internal event handler.
   */
  off<TPayload = unknown, K extends LibraryEventNameOf<M> = LibraryEventNameOf<M>>(
    event: K,
    handler: LibraryEventHandler<LibraryPayloadOf<M, K, TPayload>>,
  ): void

  /**
   * Emit an internal event to handlers in this library.
   */
  emit<TPayload = unknown, K extends LibraryEventNameOf<M> = LibraryEventNameOf<M>>(
    event: K,
    payload?: LibraryPayloadOf<M, K, TPayload>,
  ): void
}

/**
 * Shared base contract for OpenCore libraries.
 *
 * @remarks
 * Includes only library-local event operations and event name composition.
 * External bridge behavior is added by server/client wrappers.
 */
export interface OpenCoreLibraryBase<N extends LibraryName = LibraryName, M = LooseLibraryEventMap>
  extends LibraryBus<M> {
  /**
   * Library identifier.
   */
  name: N

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
 *
 * `N` is the library name, kept as a literal so the bus can be typed through the
 * `serverLibraryEvents` map typegen generates for it. That map is carried by `M` rather than derived
 * inside the body, so a named library stays assignable to the default `N = string` type.
 */
export interface OpenCoreServerLibrary<
  N extends LibraryName = LibraryName,
  M = LibraryEventsOf<ServerLibraryEvents, N>,
> extends OpenCoreLibraryBase<N, M> {
  side: 'server'
  emitExternal<TPayload = unknown>(eventName: LibraryEventName, payload?: TPayload): void
  emitNetExternal<TPayload = unknown>(
    eventName: LibraryEventName,
    target: number,
    payload?: TPayload,
  ): void
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
 *
 * `N` is the library name, kept as a literal so the bus can be typed through the
 * `clientLibraryEvents` map typegen generates for it. That map is carried by `M` rather than derived
 * inside the body, so a named library stays assignable to the default `N = string` type.
 */
export interface OpenCoreClientLibrary<
  N extends LibraryName = LibraryName,
  M = LibraryEventsOf<ClientLibraryEvents, N>,
> extends OpenCoreLibraryBase<N, M> {
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
