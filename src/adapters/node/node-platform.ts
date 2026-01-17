import type { DependencyContainer } from 'tsyringe'
import { IEngineEvents } from '../contracts/IEngineEvents'
import { IExports } from '../contracts/IExports'
import { IHasher } from '../contracts/IHasher'
import { INetTransport } from '../contracts/INetTransport'
import { IPlatformCapabilities } from '../contracts/IPlatformCapabilities'
import { IPlayerInfo } from '../contracts/IPlayerInfo'
import { IResourceInfo } from '../contracts/IResourceInfo'
import { ITick } from '../contracts/ITick'
import { IEntityServer } from '../contracts/server/IEntityServer'
import { IPedAppearanceServer } from '../contracts/server/IPedAppearanceServer'
import { IPlayerServer } from '../contracts/server/IPlayerServer'
import { IVehicleServer } from '../contracts/server/IVehicleServer'
import type { PlatformAdapter } from '../platform/platform-registry'

/**
 * Node.js mock platform adapter for testing and standalone development.
 */
export const NodePlatform: PlatformAdapter = {
  name: 'node',
  priority: 0, // Lowest priority - fallback platform

  detect(): boolean {
    // Node is the fallback platform when no other platform is detected
    // It should only match if we're running in pure Node.js
    return typeof process !== 'undefined' && process.versions?.node !== undefined
  },

  async register(container: DependencyContainer): Promise<void> {
    // Dynamically import Node.js mock implementations
    const [
      { NodeNetTransport },
      { NodeEngineEvents },
      { NodeExports },
      { NodeResourceInfo },
      { NodeTick },
      { NodePlayerInfo },
      { NodeEntityServer },
      { NodeVehicleServer },
      { NodePlayerServer },
      { NodeHasher },
      { NodePedAppearanceServer },
      { NodeCapabilities },
    ] = await Promise.all([
      import('./node-net-transport'),
      import('./node-engine-events'),
      import('./node-exports'),
      import('./node-resourceinfo'),
      import('./node-tick'),
      import('./node-playerinfo'),
      import('./node-entity-server'),
      import('./node-vehicle-server'),
      import('./node-player-server'),
      import('./node-hasher'),
      import('./node-ped-appearance-server'),
      import('./node-capabilities'),
    ])

    // Register all Node.js mock implementations
    if (!container.isRegistered(IPlatformCapabilities as any))
      container.registerSingleton(IPlatformCapabilities as any, NodeCapabilities)
    if (!container.isRegistered(INetTransport as any))
      container.registerSingleton(INetTransport as any, NodeNetTransport)
    if (!container.isRegistered(IEngineEvents as any))
      container.registerSingleton(IEngineEvents as any, NodeEngineEvents)
    if (!container.isRegistered(IExports as any))
      container.registerSingleton(IExports as any, NodeExports)
    if (!container.isRegistered(IResourceInfo as any))
      container.registerSingleton(IResourceInfo as any, NodeResourceInfo)
    if (!container.isRegistered(ITick as any)) container.registerSingleton(ITick as any, NodeTick)
    if (!container.isRegistered(IPlayerInfo as any))
      container.registerSingleton(IPlayerInfo as any, NodePlayerInfo)
    if (!container.isRegistered(IEntityServer as any))
      container.registerSingleton(IEntityServer as any, NodeEntityServer)
    if (!container.isRegistered(IVehicleServer as any))
      container.registerSingleton(IVehicleServer as any, NodeVehicleServer)
    if (!container.isRegistered(IPlayerServer as any))
      container.registerSingleton(IPlayerServer as any, NodePlayerServer)
    if (!container.isRegistered(IHasher as any))
      container.registerSingleton(IHasher as any, NodeHasher)
    if (!container.isRegistered(IPedAppearanceServer as any))
      container.registerSingleton(IPedAppearanceServer as any, NodePedAppearanceServer)
  },
}
