import type { DependencyContainer, InjectionToken } from 'tsyringe'
import { EventsAPI } from '../../../adapters/contracts/transport/events.api'
import { MessagingTransport } from '../../../adapters/contracts/transport/messaging.transport'
import { RpcAPI } from '../../../adapters/contracts/transport/rpc.api'
import { IClientRuntimeBridge } from './runtime-bridge'

/**
 * Public contract implemented by external client adapters.
 */
export interface OpenCoreClientAdapter {
  readonly name: string
  register(context: ClientAdapterContext): void | Promise<void>
}

/**
 * Registration helpers exposed to client adapters.
 */
export interface ClientAdapterContext {
  readonly adapterName: string
  readonly container: DependencyContainer
  isRegistered<T>(token: InjectionToken<T>): boolean
  bindSingleton<T>(token: InjectionToken<T>, implementation: InjectionToken<T>): void
  bindInstance<T>(token: InjectionToken<T>, value: T): void
  bindFactory<T>(token: InjectionToken<T>, factory: () => T): void
  bindMessagingTransport(transport: MessagingTransport): void
  useRuntimeBridge(runtime: IClientRuntimeBridge): void
}

export function defineClientAdapter(adapter: OpenCoreClientAdapter): OpenCoreClientAdapter {
  return adapter
}

export function bindClientTransportInstances(
  context: Pick<ClientAdapterContext, 'bindInstance'>,
  transport: MessagingTransport,
): void {
  context.bindInstance(
    MessagingTransport as unknown as InjectionToken<MessagingTransport>,
    transport,
  )
  context.bindInstance(EventsAPI as InjectionToken<EventsAPI<'client'>>, transport.events)
  context.bindInstance(RpcAPI as InjectionToken<RpcAPI<'client'>>, transport.rpc)
}
