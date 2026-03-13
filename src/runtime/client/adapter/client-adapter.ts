import type { DependencyContainer } from 'tsyringe'
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
  isRegistered(token: any): boolean
  bindSingleton(token: any, implementation: any): void
  bindInstance(token: any, value: any): void
  bindFactory(token: any, factory: () => any): void
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
  context.bindInstance(MessagingTransport as any, transport)
  context.bindInstance(EventsAPI as any, transport.events)
  context.bindInstance(RpcAPI as any, transport.rpc)
}
