import { di } from '../kernel/di/container'
import { INetTransport } from './contracts/INetTransport'
import { IEngineEvents } from './contracts/IEngineEvents'
import { IExports } from './contracts/IExports'
import { IResourceInfo } from './contracts/IResourceInfo'
import { ITick } from './contracts/ITick'
import { FiveMEngineEvents } from './fivem/fivem-engine-events'
import { FiveMExports } from './fivem/fivem-exports'
import { FiveMNetTransport } from './fivem/fivem-net-transport'
import { FiveMResourceInfo } from './fivem/fivem-resourceinfo'
import { FiveMTick } from './fivem/fivem-tick'
import { NodeEngineEvents } from './node/node-engine-events'
import { NodeExports } from './node/node-exports'
import { NodeNetTransport } from './node/node-net-transport'
import { NodeResourceInfo } from './node/node-resourceinfo'
import { NodeTick } from './node/node-tick'

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
export function registerServerCapabilities(platform?: Platform): void {
  const targetPlatform = platform ?? detectPlatform()

  if (targetPlatform === 'node') {
    // Register Node.js implementations
    if (!di.isRegistered(INetTransport as any))
      di.registerSingleton(INetTransport as any, NodeNetTransport)
    if (!di.isRegistered(IEngineEvents as any))
      di.registerSingleton(IEngineEvents as any, NodeEngineEvents)
    if (!di.isRegistered(IExports as any)) di.registerSingleton(IExports as any, NodeExports)
    if (!di.isRegistered(IResourceInfo as any))
      di.registerSingleton(IResourceInfo as any, NodeResourceInfo)
    if (!di.isRegistered(ITick as any)) di.registerSingleton(ITick as any, NodeTick)
  } else {
    // Register FiveM implementations
    if (!di.isRegistered(INetTransport as any))
      di.registerSingleton(INetTransport as any, FiveMNetTransport)
    if (!di.isRegistered(IEngineEvents as any))
      di.registerSingleton(IEngineEvents as any, FiveMEngineEvents)
    if (!di.isRegistered(IExports as any)) di.registerSingleton(IExports as any, FiveMExports)
    if (!di.isRegistered(IResourceInfo as any))
      di.registerSingleton(IResourceInfo as any, FiveMResourceInfo)
    if (!di.isRegistered(ITick as any)) di.registerSingleton(ITick as any, FiveMTick)
  }
}
