import { di } from '../container'
import { CommandProcessor } from './processors/command.processor'
import { CoreEventProcessor } from './processors/coreEvent.processor'
import { ExportProcessor } from './processors/export.processor'
import { NetEventProcessor } from './processors/netEvent.processor'
import { TickProcessor } from './processors/tick.processor'

export function registerSystemServer() {
  di.register('DecoratorProcessor', { useClass: NetEventProcessor })
  di.register('DecoratorProcessor', { useClass: TickProcessor })
  di.register('DecoratorProcessor', { useClass: ExportProcessor })
  di.register('DecoratorProcessor', { useClass: CoreEventProcessor })
  di.register('DecoratorProcessor', { useClass: CommandProcessor })
}
