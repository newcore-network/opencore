import type { DependencyContainer, InjectionToken } from 'tsyringe'
import { EventsAPI } from '../../../adapters/contracts/transport/events.api'
import { MessagingTransport } from '../../../adapters/contracts/transport/messaging.transport'
import { RpcAPI } from '../../../adapters/contracts/transport/rpc.api'
import { ServerPlayerAdapter } from './player-adapter'

/**
 * Public contract implemented by external server adapters.
 */
export interface OpenCoreServerAdapter {
  readonly name: string
  register(context: ServerAdapterContext): void | Promise<void>
}

/**
 * Registration helpers exposed to server adapters.
 */
export interface ServerAdapterContext {
  readonly adapterName: string
  readonly container: DependencyContainer
  isRegistered<T>(token: InjectionToken<T>): boolean
  bindSingleton<T>(token: InjectionToken<T>, implementation: InjectionToken<T>): void
  bindInstance<T>(token: InjectionToken<T>, value: T): void
  bindFactory<T>(token: InjectionToken<T>, factory: () => T): void
  bindMessagingTransport(transport: MessagingTransport): void
  usePlayerAdapter(adapter: ServerPlayerAdapter): void
}

/**
 * Helper for strongly typed adapter declarations.
 */
export function defineServerAdapter(adapter: OpenCoreServerAdapter): OpenCoreServerAdapter {
  return adapter
}

export function bindTransportInstances(
  context: Pick<ServerAdapterContext, 'bindInstance'>,
  transport: MessagingTransport,
): void {
  context.bindInstance(
    MessagingTransport as unknown as InjectionToken<MessagingTransport>,
    transport,
  )
  context.bindInstance(EventsAPI as InjectionToken<EventsAPI<'server'>>, transport.events)
  context.bindInstance(RpcAPI as InjectionToken<RpcAPI<'server'>>, transport.rpc)
}
