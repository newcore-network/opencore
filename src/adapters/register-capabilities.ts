import { di } from '../kernel/di/container'
import { INetTransport } from './contracts/INetTransport'
import { IEngineEvents } from './contracts/IEngineEvents'
import { IExports } from './contracts/IExports'
import { IResourceInfo } from './contracts/IResourceInfo'
import { ITick } from './contracts/ITick'
import { IPlayerInfo } from './contracts/IPlayerInfo'
import { IEntityServer } from './contracts/IEntityServer'
import { IVehicleServer } from './contracts/IVehicleServer'
import { IPlayerServer } from './contracts/IPlayerServer'
import { IHasher } from './contracts/IHasher'
import { IPedAppearanceClient } from './contracts/IPedAppearanceClient'
import { IPedAppearanceServer } from './contracts/IPedAppearanceServer'

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
 * Registers platform-specific capability implementations
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
      { NodePedAppearanceClient },
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
      import('./node/node-ped-appearance-client'),
      import('./node/node-ped-appearance-server'),
    ])

    // Register Node.js implementations
    if (!di.isRegistered(INetTransport as any))
      di.registerSingleton(INetTransport as any, NodeNetTransport)
    if (!di.isRegistered(IEngineEvents as any))
      di.registerSingleton(IEngineEvents as any, NodeEngineEvents)
    if (!di.isRegistered(IExports as any)) di.registerSingleton(IExports as any, NodeExports)
    if (!di.isRegistered(IResourceInfo as any))
      di.registerSingleton(IResourceInfo as any, NodeResourceInfo)
    if (!di.isRegistered(ITick as any)) di.registerSingleton(ITick as any, NodeTick)
    if (!di.isRegistered(IPlayerInfo as any))
      di.registerSingleton(IPlayerInfo as any, NodePlayerInfo)
    if (!di.isRegistered(IEntityServer as any))
      di.registerSingleton(IEntityServer as any, NodeEntityServer)
    if (!di.isRegistered(IVehicleServer as any))
      di.registerSingleton(IVehicleServer as any, NodeVehicleServer)
    if (!di.isRegistered(IPlayerServer as any))
      di.registerSingleton(IPlayerServer as any, NodePlayerServer)
    if (!di.isRegistered(IHasher as any)) di.registerSingleton(IHasher as any, NodeHasher)
    if (!di.isRegistered(IPedAppearanceClient as any))
      di.registerSingleton(IPedAppearanceClient as any, NodePedAppearanceClient)
    if (!di.isRegistered(IPedAppearanceServer as any))
      di.registerSingleton(IPedAppearanceServer as any, NodePedAppearanceServer)
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
      { FiveMPedAppearanceClientAdapter },
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
      import('./fivem/fivem-ped-appearance-client'),
      import('./fivem/fivem-ped-appearance-server'),
    ])

    // Register FiveM implementations
    if (!di.isRegistered(INetTransport as any))
      di.registerSingleton(INetTransport as any, FiveMNetTransport)
    if (!di.isRegistered(IEngineEvents as any))
      di.registerSingleton(IEngineEvents as any, FiveMEngineEvents)
    if (!di.isRegistered(IExports as any)) di.registerSingleton(IExports as any, FiveMExports)
    if (!di.isRegistered(IResourceInfo as any))
      di.registerSingleton(IResourceInfo as any, FiveMResourceInfo)
    if (!di.isRegistered(ITick as any)) di.registerSingleton(ITick as any, FiveMTick)
    if (!di.isRegistered(IPlayerInfo as any))
      di.registerSingleton(IPlayerInfo as any, FiveMPlayerInfo)
    if (!di.isRegistered(IEntityServer as any))
      di.registerSingleton(IEntityServer as any, FiveMEntityServer)
    if (!di.isRegistered(IVehicleServer as any))
      di.registerSingleton(IVehicleServer as any, FiveMVehicleServer)
    if (!di.isRegistered(IPlayerServer as any))
      di.registerSingleton(IPlayerServer as any, FiveMPlayerServer)
    if (!di.isRegistered(IHasher as any)) di.registerSingleton(IHasher as any, FiveMHasher)
    if (!di.isRegistered(IPedAppearanceClient as any))
      di.registerSingleton(IPedAppearanceClient as any, FiveMPedAppearanceClientAdapter)
    if (!di.isRegistered(IPedAppearanceServer as any))
      di.registerSingleton(IPedAppearanceServer as any, FiveMPedAppearanceServerAdapter)
  }
}
