import type { DependencyContainer } from 'tsyringe'
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
  isRegistered(token: any): boolean
  bindSingleton(token: any, implementation: any): void
  bindInstance(token: any, value: any): void
  bindFactory(token: any, factory: () => any): void
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
  context.bindInstance(MessagingTransport as any, transport)
  context.bindInstance(EventsAPI as any, transport.events)
  context.bindInstance(RpcAPI as any, transport.rpc)
}
