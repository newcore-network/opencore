import { di } from '../runtime/client/client-container'
import { IPedAppearanceClient } from './contracts/client/IPedAppearanceClient'
import { IHasher } from './contracts/IHasher'
import { EventsAPI } from './contracts/transport/events.api'
import { MessagingTransport } from './contracts/transport/messaging.transport'
import { RpcAPI } from './contracts/transport/rpc.api'

/**
 * Registers client-side platform-specific capability implementations.
 *
 * @remarks
 * Deprecated in favor of `Client.init({ adapter })` and custom client adapters.
 *
 * This legacy helper now installs only the built-in Node fallback bindings.
 */
export async function registerClientCapabilities(): Promise<void> {
  const [{ NodeMessagingTransport }, { NodePedAppearanceClient }, { NodeHasher }] =
    await Promise.all([
      import('./node/transport/adapter'),
      import('./node/node-ped-appearance-client'),
      import('./node/node-hasher'),
    ])

  if (!di.isRegistered(MessagingTransport as any)) {
    const transport = new NodeMessagingTransport('client')
    di.registerInstance(MessagingTransport as any, transport)
    di.registerInstance(EventsAPI as any, transport.events)
    di.registerInstance(RpcAPI as any, transport.rpc)
  }

  if (!di.isRegistered(IPedAppearanceClient as any)) {
    di.registerSingleton(IPedAppearanceClient as any, NodePedAppearanceClient)
  }

  if (!di.isRegistered(IHasher as any)) {
    di.registerSingleton(IHasher as any, NodeHasher)
  }
}
