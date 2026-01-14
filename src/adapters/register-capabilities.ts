import { GLOBAL_CONTAINER } from '../kernel/di/container'
import { IEngineEvents } from './contracts/IEngineEvents'
import { IExports } from './contracts/IExports'
import { IHasher } from './contracts/IHasher'
import { INetTransport } from './contracts/INetTransport'
import { IPlayerInfo } from './contracts/IPlayerInfo'
import { IResourceInfo } from './contracts/IResourceInfo'
import { ITick } from './contracts/ITick'
import { IEntityServer } from './contracts/server/IEntityServer'
import { IPedAppearanceServer } from './contracts/server/IPedAppearanceServer'
import { IPlayerServer } from './contracts/server/IPlayerServer'
import { IVehicleServer } from './contracts/server/IVehicleServer'

export type Platform = 'fivem' | 'node'

/**
 * Detects the current runtime platform
 */
function detectPlatform(): Platform {
  // Check for FiveM-specific globals
  if (typeof (globalThis as any).GetCurrentResourceName === 'function') {
    return 'fivem'
  }
  return 'node'
}

/**
 * Registers server-side platform-specific capability implementations.
 *
 * @remarks
 * This function registers adapters needed by the SERVER runtime only.
 * Client-side adapters are registered separately via `registerClientCapabilities`.
 *
 * @param platform - Optional platform override. If not provided, platform is auto-detected.
 */
export async function registerServerCapabilities(platform?: Platform): Promise<void> {
  const targetPlatform = platform ?? detectPlatform()

  if (targetPlatform === 'node') {
    // Dynamically import Node.js implementations only when needed
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
    ] = await Promise.all([
      import('./node/node-net-transport'),
      import('./node/node-engine-events'),
      import('./node/node-exports'),
      import('./node/node-resourceinfo'),
      import('./node/node-tick'),
      import('./node/node-playerinfo'),
      import('./node/node-entity-server'),
      import('./node/node-vehicle-server'),
      import('./node/node-player-server'),
      import('./node/node-hasher'),
      import('./node/node-ped-appearance-server'),
    ])

    // Register Node.js implementations (server-side only)
    if (!GLOBAL_CONTAINER.isRegistered(INetTransport as any))
      GLOBAL_CONTAINER.registerSingleton(INetTransport as any, NodeNetTransport)
    if (!GLOBAL_CONTAINER.isRegistered(IEngineEvents as any))
      GLOBAL_CONTAINER.registerSingleton(IEngineEvents as any, NodeEngineEvents)
    if (!GLOBAL_CONTAINER.isRegistered(IExports as any))
      GLOBAL_CONTAINER.registerSingleton(IExports as any, NodeExports)
    if (!GLOBAL_CONTAINER.isRegistered(IResourceInfo as any))
      GLOBAL_CONTAINER.registerSingleton(IResourceInfo as any, NodeResourceInfo)
    if (!GLOBAL_CONTAINER.isRegistered(ITick as any))
      GLOBAL_CONTAINER.registerSingleton(ITick as any, NodeTick)
    if (!GLOBAL_CONTAINER.isRegistered(IPlayerInfo as any))
      GLOBAL_CONTAINER.registerSingleton(IPlayerInfo as any, NodePlayerInfo)
    if (!GLOBAL_CONTAINER.isRegistered(IEntityServer as any))
      GLOBAL_CONTAINER.registerSingleton(IEntityServer as any, NodeEntityServer)
    if (!GLOBAL_CONTAINER.isRegistered(IVehicleServer as any))
      GLOBAL_CONTAINER.registerSingleton(IVehicleServer as any, NodeVehicleServer)
    if (!GLOBAL_CONTAINER.isRegistered(IPlayerServer as any))
      GLOBAL_CONTAINER.registerSingleton(IPlayerServer as any, NodePlayerServer)
    if (!GLOBAL_CONTAINER.isRegistered(IHasher as any))
      GLOBAL_CONTAINER.registerSingleton(IHasher as any, NodeHasher)
    if (!GLOBAL_CONTAINER.isRegistered(IPedAppearanceServer as any))
      GLOBAL_CONTAINER.registerSingleton(IPedAppearanceServer as any, NodePedAppearanceServer)
  } else {
    // Dynamically import FiveM implementations only when needed
    const [
      { FiveMNetTransport },
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
    ] = await Promise.all([
      import('./fivem/fivem-net-transport'),
      import('./fivem/fivem-engine-events'),
      import('./fivem/fivem-exports'),
      import('./fivem/fivem-resourceinfo'),
      import('./fivem/fivem-tick'),
      import('./fivem/fivem-playerinfo'),
      import('./fivem/fivem-entity-server'),
      import('./fivem/fivem-vehicle-server'),
      import('./fivem/fivem-player-server'),
      import('./fivem/fivem-hasher'),
      import('./fivem/fivem-ped-appearance-server'),
    ])

    // Register FiveM implementations (server-side only)
    if (!GLOBAL_CONTAINER.isRegistered(INetTransport as any))
      GLOBAL_CONTAINER.registerSingleton(INetTransport as any, FiveMNetTransport)
    if (!GLOBAL_CONTAINER.isRegistered(IEngineEvents as any))
      GLOBAL_CONTAINER.registerSingleton(IEngineEvents as any, FiveMEngineEvents)
    if (!GLOBAL_CONTAINER.isRegistered(IExports as any))
      GLOBAL_CONTAINER.registerSingleton(IExports as any, FiveMExports)
    if (!GLOBAL_CONTAINER.isRegistered(IResourceInfo as any))
      GLOBAL_CONTAINER.registerSingleton(IResourceInfo as any, FiveMResourceInfo)
    if (!GLOBAL_CONTAINER.isRegistered(ITick as any))
      GLOBAL_CONTAINER.registerSingleton(ITick as any, FiveMTick)
    if (!GLOBAL_CONTAINER.isRegistered(IPlayerInfo as any))
      GLOBAL_CONTAINER.registerSingleton(IPlayerInfo as any, FiveMPlayerInfo)
    if (!GLOBAL_CONTAINER.isRegistered(IEntityServer as any))
      GLOBAL_CONTAINER.registerSingleton(IEntityServer as any, FiveMEntityServer)
    if (!GLOBAL_CONTAINER.isRegistered(IVehicleServer as any))
      GLOBAL_CONTAINER.registerSingleton(IVehicleServer as any, FiveMVehicleServer)
    if (!GLOBAL_CONTAINER.isRegistered(IPlayerServer as any))
      GLOBAL_CONTAINER.registerSingleton(IPlayerServer as any, FiveMPlayerServer)
    if (!GLOBAL_CONTAINER.isRegistered(IHasher as any))
      GLOBAL_CONTAINER.registerSingleton(IHasher as any, FiveMHasher)
    if (!GLOBAL_CONTAINER.isRegistered(IPedAppearanceServer as any))
      GLOBAL_CONTAINER.registerSingleton(
        IPedAppearanceServer as any,
        FiveMPedAppearanceServerAdapter,
      )
  }
}
