import type { DependencyContainer } from 'tsyringe'
import { IEngineEvents } from '../contracts/IEngineEvents'
import { IExports } from '../contracts/IExports'
import { IHasher } from '../contracts/IHasher'
import { IPlatformCapabilities } from '../contracts/IPlatformCapabilities'
import { IPlayerInfo } from '../contracts/IPlayerInfo'
import { IResourceInfo } from '../contracts/IResourceInfo'
import { ITick } from '../contracts/ITick'
import { IEntityServer } from '../contracts/server/IEntityServer'
import { IPedAppearanceServer } from '../contracts/server/IPedAppearanceServer'
import { IPlayerServer } from '../contracts/server/IPlayerServer'
import { IVehicleServer } from '../contracts/server/IVehicleServer'
import { EventsAPI } from '../contracts/transport/events.api'
import { MessagingTransport } from '../contracts/transport/messaging.transport'
import { RpcAPI } from '../contracts/transport/rpc.api'
import type { PlatformAdapter } from '../platform/platform-registry'

/**
 * FiveM platform adapter for automatic registration.
 */
export const FiveMPlatform: PlatformAdapter = {
  name: 'fivem',
  priority: 100, // High priority - check FiveM first

  detect(): boolean {
    return typeof (globalThis as any).GetCurrentResourceName === 'function'
  },

  async register(container: DependencyContainer): Promise<void> {
    // Dynamically import FiveM implementations
    const [
      { FiveMMessagingTransport },
      { FiveMEngineEvents },
      { FiveMExports },
      { FiveMResourceInfo },
      { FiveMTick },
      { FiveMPlayerInfo },
      { FiveMEntityServer },
      { FiveMVehicleServer },
      { FiveMPlayerServer },
      { FiveMHasher },
      { FiveMPedAppearanceServerAdapter },
      { FiveMCapabilities },
    ] = await Promise.all([
      import('./transport/adapter'),
      import('./fivem-engine-events'),
      import('./fivem-exports'),
      import('./fivem-resourceinfo'),
      import('./fivem-tick'),
      import('./fivem-playerinfo'),
      import('./fivem-entity-server'),
      import('./fivem-vehicle-server'),
      import('./fivem-player-server'),
      import('./fivem-hasher'),
      import('./fivem-ped-appearance-server'),
      import('./fivem-capabilities'),
    ])

    // Register all FiveM implementations
    if (!container.isRegistered(IPlatformCapabilities as any))
      container.registerSingleton(IPlatformCapabilities as any, FiveMCapabilities)

    if (!container.isRegistered(MessagingTransport as any)) {
      const transport = new FiveMMessagingTransport()
      container.registerInstance(MessagingTransport as any, transport)
      container.registerInstance(EventsAPI as any, transport.events)
      container.registerInstance(RpcAPI as any, transport.rpc)
    }
    if (!container.isRegistered(IEngineEvents as any))
      container.registerSingleton(IEngineEvents as any, FiveMEngineEvents)
    if (!container.isRegistered(IExports as any))
      container.registerSingleton(IExports as any, FiveMExports)
    if (!container.isRegistered(IResourceInfo as any))
      container.registerSingleton(IResourceInfo as any, FiveMResourceInfo)
    if (!container.isRegistered(ITick as any)) container.registerSingleton(ITick as any, FiveMTick)
    if (!container.isRegistered(IPlayerInfo as any))
      container.registerSingleton(IPlayerInfo as any, FiveMPlayerInfo)
    if (!container.isRegistered(IEntityServer as any))
      container.registerSingleton(IEntityServer as any, FiveMEntityServer)
    if (!container.isRegistered(IVehicleServer as any))
      container.registerSingleton(IVehicleServer as any, FiveMVehicleServer)
    if (!container.isRegistered(IPlayerServer as any))
      container.registerSingleton(IPlayerServer as any, FiveMPlayerServer)
    if (!container.isRegistered(IHasher as any))
      container.registerSingleton(IHasher as any, FiveMHasher)
    if (!container.isRegistered(IPedAppearanceServer as any))
      container.registerSingleton(IPedAppearanceServer as any, FiveMPedAppearanceServerAdapter)
  },
}
