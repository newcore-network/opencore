import type { DependencyContainer } from 'tsyringe'
import { IEngineEvents } from '../contracts/IEngineEvents'
import { IExports } from '../contracts/IExports'
import { IHasher } from '../contracts/IHasher'
import { IPlatformCapabilities } from '../contracts/IPlatformCapabilities'
import { IPlayerInfo } from '../contracts/IPlayerInfo'
import { IResourceInfo } from '../contracts/IResourceInfo'
import { ITick } from '../contracts/ITick'
import { IEntityServer } from '../contracts/server/IEntityServer'
import { IPedServer } from '../contracts/server/IPedServer'
import { IPedAppearanceServer } from '../contracts/server/IPedAppearanceServer'
import { IPlayerServer } from '../contracts/server/IPlayerServer'
import { IVehicleServer } from '../contracts/server/IVehicleServer'
import { EventsAPI } from '../contracts/transport/events.api'
import { MessagingTransport } from '../contracts/transport/messaging.transport'
import { RpcAPI } from '../contracts/transport/rpc.api'
import type { PlatformAdapter } from '../platform/platform-registry'
import { detectCfxGameProfile, isCfxRuntime } from './runtime-profile'

export const CfxPlatform: PlatformAdapter = {
  name: 'cfx',
  priority: 100,

  detect(): boolean {
    return isCfxRuntime()
  },

  async register(container: DependencyContainer): Promise<void> {
    const profile = detectCfxGameProfile()
    const [
      { FiveMMessagingTransport },
      { FiveMEngineEvents },
      { FiveMExports },
      { FiveMResourceInfo },
      { FiveMTick },
      { FiveMPlayerInfo },
      { FiveMEntityServer },
      { FiveMPedServer },
      { FiveMVehicleServer },
      { FiveMPlayerServer },
      { FiveMHasher },
      { FiveMPedAppearanceServerAdapter },
      { NodePedAppearanceServer },
      { CfxCapabilities },
    ] = await Promise.all([
      import('../fivem/transport/adapter'),
      import('../fivem/fivem-engine-events'),
      import('../fivem/fivem-exports'),
      import('../fivem/fivem-resourceinfo'),
      import('../fivem/fivem-tick'),
      import('../fivem/fivem-playerinfo'),
      import('../fivem/fivem-entity-server'),
      import('../fivem/fivem-ped-server'),
      import('../fivem/fivem-vehicle-server'),
      import('../fivem/fivem-player-server'),
      import('../fivem/fivem-hasher'),
      import('../fivem/fivem-ped-appearance-server'),
      import('../node/node-ped-appearance-server'),
      import('./cfx-capabilities'),
    ])

    if (!container.isRegistered(IPlatformCapabilities as any)) {
      container.registerSingleton(IPlatformCapabilities as any, CfxCapabilities)
    }

    if (!container.isRegistered(MessagingTransport as any)) {
      const transport = new FiveMMessagingTransport()
      container.registerInstance(MessagingTransport as any, transport)
      container.registerInstance(EventsAPI as any, transport.events)
      container.registerInstance(RpcAPI as any, transport.rpc)
    }

    if (!container.isRegistered(IEngineEvents as any)) {
      container.registerSingleton(IEngineEvents as any, FiveMEngineEvents)
    }
    if (!container.isRegistered(IExports as any)) {
      container.registerSingleton(IExports as any, FiveMExports)
    }
    if (!container.isRegistered(IResourceInfo as any)) {
      container.registerSingleton(IResourceInfo as any, FiveMResourceInfo)
    }
    if (!container.isRegistered(ITick as any)) {
      container.registerSingleton(ITick as any, FiveMTick)
    }
    if (!container.isRegistered(IPlayerInfo as any)) {
      container.registerSingleton(IPlayerInfo as any, FiveMPlayerInfo)
    }
    if (!container.isRegistered(IEntityServer as any)) {
      container.registerSingleton(IEntityServer as any, FiveMEntityServer)
    }
    if (!container.isRegistered(IPedServer as any)) {
      container.registerSingleton(IPedServer as any, FiveMPedServer)
    }
    if (!container.isRegistered(IVehicleServer as any)) {
      container.registerSingleton(IVehicleServer as any, FiveMVehicleServer)
    }
    if (!container.isRegistered(IPlayerServer as any)) {
      container.registerSingleton(IPlayerServer as any, FiveMPlayerServer)
    }
    if (!container.isRegistered(IHasher as any)) {
      container.registerSingleton(IHasher as any, FiveMHasher)
    }

    if (!container.isRegistered(IPedAppearanceServer as any)) {
      const appearanceImpl =
        profile === 'rdr3' ? NodePedAppearanceServer : FiveMPedAppearanceServerAdapter
      container.registerSingleton(IPedAppearanceServer as any, appearanceImpl)
    }
  },
}
