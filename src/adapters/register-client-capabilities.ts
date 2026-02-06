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
 * This function registers adapters needed by the CLIENT runtime only.
 * Should be called during client bootstrap before services that depend on these adapters.
 */
export async function registerClientCapabilities(): Promise<void> {
  if (!di.isRegistered(MessagingTransport as any)) {
    const isFiveM = typeof (globalThis as any).GetCurrentResourceName === 'function'

    if (isFiveM) {
      const [{ FiveMMessagingTransport }] = await Promise.all([import('./fivem/transport/adapter')])
      const transport = new FiveMMessagingTransport()
      di.registerInstance(MessagingTransport as any, transport)
      di.registerInstance(EventsAPI as any, transport.events)
      di.registerInstance(RpcAPI as any, transport.rpc)
    } else {
      const [{ NodeMessagingTransport }] = await Promise.all([import('./node/transport/adapter')])
      const transport = new NodeMessagingTransport('client')
      di.registerInstance(MessagingTransport as any, transport)
      di.registerInstance(EventsAPI as any, transport.events)
      di.registerInstance(RpcAPI as any, transport.rpc)
    }
  }

  const [{ FiveMPedAppearanceClientAdapter }, { FiveMHasher }] = await Promise.all([
    import('./fivem/fivem-ped-appearance-client'),
    import('./fivem/fivem-hasher'),
  ])

  if (!di.isRegistered(IPedAppearanceClient as any))
    di.registerSingleton(IPedAppearanceClient as any, FiveMPedAppearanceClientAdapter)
  if (!di.isRegistered(IHasher as any)) di.registerSingleton(IHasher as any, FiveMHasher)
}
