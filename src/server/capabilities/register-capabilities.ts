import { di } from '../container'
import { INetTransport } from './INetTransport'
import { IEngineEvents } from './IEngineEvents'
import { IExports } from './IExports'
import { IResourceInfo } from './IResourceInfo'
import { FiveMEngineEvents } from './fivem/fivem-engine-events'
import { FiveMExports } from './fivem/fivem-exports'
import { FiveMNetTransport } from './fivem/fivem-net-transport'
import { FiveMResourceInfo } from './fivem/fivem-resourceinfo'

export function registerServerCapabilities(): void {
  if (!di.isRegistered(INetTransport as any))
    di.registerSingleton(INetTransport as any, FiveMNetTransport)
  if (!di.isRegistered(IEngineEvents as any))
    di.registerSingleton(IEngineEvents as any, FiveMEngineEvents)
  if (!di.isRegistered(IExports as any)) di.registerSingleton(IExports as any, FiveMExports)
  if (!di.isRegistered(IResourceInfo as any))
    di.registerSingleton(IResourceInfo as any, FiveMResourceInfo)
}
