import { di } from '../client-container'
import { KeyMappingProcessor } from './processors/key.processor'
import { TickProcessor } from './processors/tick.processor'
import { NuiProcessor } from './processors/nui.processor'
import { ClientNetEventProcessor } from './processors/netEvent.processor'
import { LocalEventProcessor } from './processors/localEvent.processor'
import { IntervalProcessor } from './processors/interval.processor'
import { ClientExportProcessor } from './processors/export.processor'
import {
  ResourceStartProcessor,
  ResourceStopProcessor,
} from './processors/resourceLifecycle.processor'
import { GameEventProcessor } from './processors/gameEvent.processor'

export function registerSystemClient() {
  // Core processors
  di.register('DecoratorProcessor', { useClass: KeyMappingProcessor })
  di.register('DecoratorProcessor', { useClass: TickProcessor })
  di.register('DecoratorProcessor', { useClass: NuiProcessor })
  di.register('DecoratorProcessor', { useClass: ClientNetEventProcessor })

  // New processors
  di.register('DecoratorProcessor', { useClass: LocalEventProcessor })
  di.register('DecoratorProcessor', { useClass: IntervalProcessor })
  di.register('DecoratorProcessor', { useClass: ClientExportProcessor })
  di.register('DecoratorProcessor', { useClass: ResourceStartProcessor })
  di.register('DecoratorProcessor', { useClass: ResourceStopProcessor })
  di.register('DecoratorProcessor', { useClass: GameEventProcessor })
}
