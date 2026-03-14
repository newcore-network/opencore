import type { InjectionToken } from 'tsyringe'
import { IEngineEvents } from '../../../adapters/contracts/IEngineEvents'
import { IExports } from '../../../adapters/contracts/IExports'
import { IHasher } from '../../../adapters/contracts/IHasher'
import { IPlatformContext } from '../../../adapters/contracts/IPlatformContext'
import { IPlayerInfo } from '../../../adapters/contracts/IPlayerInfo'
import { IResourceInfo } from '../../../adapters/contracts/IResourceInfo'
import { ITick } from '../../../adapters/contracts/ITick'
import { IEntityServer } from '../../../adapters/contracts/server/IEntityServer'
import { INpcLifecycleServer } from '../../../adapters/contracts/server/npc-lifecycle/INpcLifecycleServer'
import { IPedAppearanceServer } from '../../../adapters/contracts/server/IPedAppearanceServer'
import { IPedServer } from '../../../adapters/contracts/server/IPedServer'
import { IPlayerAppearanceLifecycleServer } from '../../../adapters/contracts/server/player-appearance/IPlayerAppearanceLifecycleServer'
import { IPlayerLifecycleServer } from '../../../adapters/contracts/server/player-lifecycle/IPlayerLifecycleServer'
import { IPlayerStateSyncServer } from '../../../adapters/contracts/server/player-state/IPlayerStateSyncServer'
import { IPlayerServer } from '../../../adapters/contracts/server/IPlayerServer'
import { IVehicleLifecycleServer } from '../../../adapters/contracts/server/vehicle-lifecycle/IVehicleLifecycleServer'
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
        { NodePlatformContext },
        { NodePlayerLifecycleServer },
        { NodeVehicleLifecycleServer },
        { NodeNpcLifecycleServer },
        { NodePlayerAppearanceLifecycleServer },
        { NodePlayerStateSyncServer },
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
        import('./node-player-lifecycle-server'),
        import('./node-vehicle-lifecycle-server'),
        import('./node-npc-lifecycle-server'),
        import('./node-player-appearance-lifecycle-server'),
        import('./node-player-state-sync-server'),
      ])

      ctx.bindSingleton(IPlatformContext as InjectionToken<IPlatformContext>, NodePlatformContext)

      const transport = new NodeMessagingTransport('server')
      ctx.bindMessagingTransport(transport)

      ctx.bindSingleton(IEngineEvents as InjectionToken<IEngineEvents>, NodeEngineEvents)
      ctx.bindSingleton(IExports as InjectionToken<IExports>, NodeExports)
      ctx.bindSingleton(IResourceInfo as InjectionToken<IResourceInfo>, NodeResourceInfo)
      ctx.bindSingleton(ITick as InjectionToken<ITick>, NodeTick)
      ctx.bindSingleton(IPlayerInfo as InjectionToken<IPlayerInfo>, NodePlayerInfo)
      ctx.bindSingleton(IEntityServer as InjectionToken<IEntityServer>, NodeEntityServer)
      ctx.bindSingleton(
        INpcLifecycleServer as InjectionToken<INpcLifecycleServer>,
        NodeNpcLifecycleServer,
      )
      ctx.bindSingleton(IPedServer as InjectionToken<IPedServer>, NodePedServer)
      ctx.bindSingleton(IVehicleServer as InjectionToken<IVehicleServer>, NodeVehicleServer)
      ctx.bindSingleton(
        IVehicleLifecycleServer as InjectionToken<IVehicleLifecycleServer>,
        NodeVehicleLifecycleServer,
      )
      ctx.bindSingleton(IPlayerServer as InjectionToken<IPlayerServer>, NodePlayerServer)
      ctx.bindSingleton(
        IPlayerAppearanceLifecycleServer as InjectionToken<IPlayerAppearanceLifecycleServer>,
        NodePlayerAppearanceLifecycleServer,
      )
      ctx.bindSingleton(
        IPlayerStateSyncServer as InjectionToken<IPlayerStateSyncServer>,
        NodePlayerStateSyncServer,
      )
      ctx.bindSingleton(
        IPlayerLifecycleServer as InjectionToken<IPlayerLifecycleServer>,
        NodePlayerLifecycleServer,
      )
      ctx.bindSingleton(IHasher as InjectionToken<IHasher>, NodeHasher)
      ctx.bindSingleton(
        IPedAppearanceServer as InjectionToken<IPedAppearanceServer>,
        NodePedAppearanceServer,
      )
    },
  })
}
