import { IEngineEvents } from '../../../adapters/contracts/IEngineEvents'
import { IExports } from '../../../adapters/contracts/IExports'
import { IHasher } from '../../../adapters/contracts/IHasher'
import { IPlatformCapabilities } from '../../../adapters/contracts/IPlatformCapabilities'
import { IPlayerInfo } from '../../../adapters/contracts/IPlayerInfo'
import { IResourceInfo } from '../../../adapters/contracts/IResourceInfo'
import { ITick } from '../../../adapters/contracts/ITick'
import { IEntityServer } from '../../../adapters/contracts/server/IEntityServer'
import { IPedAppearanceServer } from '../../../adapters/contracts/server/IPedAppearanceServer'
import { IPedServer } from '../../../adapters/contracts/server/IPedServer'
import { IPlayerServer } from '../../../adapters/contracts/server/IPlayerServer'
import { IVehicleServer } from '../../../adapters/contracts/server/IVehicleServer'
import { defineServerAdapter, type OpenCoreServerAdapter } from './server-adapter'

/**
 * Default server adapter used when no runtime adapter is provided.
 */
export function createNodeServerAdapter(): OpenCoreServerAdapter {
  return defineServerAdapter({
    name: 'node',
    async register(ctx) {
      const [
        { NodeMessagingTransport },
        { NodeEngineEvents },
        { NodeExports },
        { NodeResourceInfo },
        { NodeTick },
        { NodePlayerInfo },
        { NodeEntityServer },
        { NodePedServer },
        { NodeVehicleServer },
        { NodePlayerServer },
        { NodeHasher },
        { NodePedAppearanceServer },
        { NodeCapabilities },
      ] = await Promise.all([
        import('../../../adapters/node/transport/adapter'),
        import('../../../adapters/node/node-engine-events'),
        import('../../../adapters/node/node-exports'),
        import('../../../adapters/node/node-resourceinfo'),
        import('../../../adapters/node/node-tick'),
        import('../../../adapters/node/node-playerinfo'),
        import('../../../adapters/node/node-entity-server'),
        import('../../../adapters/node/node-ped-server'),
        import('../../../adapters/node/node-vehicle-server'),
        import('../../../adapters/node/node-player-server'),
        import('../../../adapters/node/node-hasher'),
        import('../../../adapters/node/node-ped-appearance-server'),
        import('../../../adapters/node/node-capabilities'),
      ])

      ctx.bindSingleton(IPlatformCapabilities as any, NodeCapabilities)

      const transport = new NodeMessagingTransport('server')
      ctx.bindMessagingTransport(transport)

      ctx.bindSingleton(IEngineEvents as any, NodeEngineEvents)
      ctx.bindSingleton(IExports as any, NodeExports)
      ctx.bindSingleton(IResourceInfo as any, NodeResourceInfo)
      ctx.bindSingleton(ITick as any, NodeTick)
      ctx.bindSingleton(IPlayerInfo as any, NodePlayerInfo)
      ctx.bindSingleton(IEntityServer as any, NodeEntityServer)
      ctx.bindSingleton(IPedServer as any, NodePedServer)
      ctx.bindSingleton(IVehicleServer as any, NodeVehicleServer)
      ctx.bindSingleton(IPlayerServer as any, NodePlayerServer)
      ctx.bindSingleton(IHasher as any, NodeHasher)
      ctx.bindSingleton(IPedAppearanceServer as any, NodePedAppearanceServer)
    },
  })
}
