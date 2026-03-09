import { IPedAppearanceClient } from '../../../adapters/contracts/client/IPedAppearanceClient'
import { IHasher } from '../../../adapters/contracts/IHasher'
import { IClientLocalPlayerBridge } from './local-player-bridge'
import { NodeClientLocalPlayerBridge } from './node-local-player-bridge'
import { NodeClientRuntimeBridge } from './node-runtime-bridge'
import { defineClientAdapter, type OpenCoreClientAdapter } from './client-adapter'
import { IClientRuntimeBridge } from './runtime-bridge'

/**
 * Default client adapter used when no runtime adapter is provided.
 */
export function createNodeClientAdapter(): OpenCoreClientAdapter {
  return defineClientAdapter({
    name: 'node',
    async register(ctx) {
      const [
        { NodeMessagingTransport },
        { NodePedAppearanceClient },
        { NodeHasher },
      ] = await Promise.all([
        import('../../../adapters/node/transport/adapter'),
        import('../../../adapters/node/node-ped-appearance-client'),
        import('../../../adapters/node/node-hasher'),
      ])

      const transport = new NodeMessagingTransport('client')
      ctx.bindMessagingTransport(transport)
      ctx.bindSingleton(IPedAppearanceClient as any, NodePedAppearanceClient)
      ctx.bindSingleton(IHasher as any, NodeHasher)
      ctx.bindSingleton(IClientRuntimeBridge as any, NodeClientRuntimeBridge)
      ctx.bindSingleton(IClientLocalPlayerBridge as any, NodeClientLocalPlayerBridge)
    },
  })
}
