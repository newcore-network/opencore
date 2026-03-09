import { di } from '../runtime/client/client-container'
import { IPedAppearanceClient } from './contracts/client/IPedAppearanceClient'
import { IHasher } from './contracts/IHasher'
import { EventsAPI } from './contracts/transport/events.api'
import { MessagingTransport } from './contracts/transport/messaging.transport'
import { RpcAPI } from './contracts/transport/rpc.api'
import { detectCfxGameProfile, isCfxRuntime } from './cfx/runtime-profile'

/**
 * Registers client-side platform-specific capability implementations.
 *
 * @remarks
 * Deprecated in favor of `Client.init({ adapter })` and custom client adapters.
 */
export async function registerClientCapabilities(): Promise<void> {
  const cfxRuntime = isCfxRuntime()
  const gameProfile = cfxRuntime ? detectCfxGameProfile() : 'common'

  if (!di.isRegistered(MessagingTransport as any)) {
    if (cfxRuntime) {
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

  if (!di.isRegistered(IPedAppearanceClient as any)) {
    if (cfxRuntime && gameProfile === 'rdr3') {
      const [{ RedMPedAppearanceClientAdapter }] = await Promise.all([
        import('./redm/redm-ped-appearance-client'),
      ])
      di.registerSingleton(IPedAppearanceClient as any, RedMPedAppearanceClientAdapter)
    } else if (cfxRuntime) {
      const [{ FiveMPedAppearanceClientAdapter }] = await Promise.all([
        import('./fivem/fivem-ped-appearance-client'),
      ])
      di.registerSingleton(IPedAppearanceClient as any, FiveMPedAppearanceClientAdapter)
    } else {
      const [{ NodePedAppearanceClient }] = await Promise.all([
        import('./node/node-ped-appearance-client'),
      ])
      di.registerSingleton(IPedAppearanceClient as any, NodePedAppearanceClient)
    }
  }

  if (!di.isRegistered(IHasher as any)) {
    if (cfxRuntime) {
      const [{ FiveMHasher }] = await Promise.all([import('./fivem/fivem-hasher')])
      di.registerSingleton(IHasher as any, FiveMHasher)
    } else {
      const [{ NodeHasher }] = await Promise.all([import('./node/node-hasher')])
      di.registerSingleton(IHasher as any, NodeHasher)
    }
  }
}
