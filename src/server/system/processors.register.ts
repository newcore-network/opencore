import { di } from '../container'
import { DefaultSecurityHandler } from '../services/default/default-security.handler'
import { SecurityHandlerContract } from '../templates/security/security-handler.contract'
import { CommandProcessor } from './processors/command.processor'
import { CoreEventProcessor } from './processors/coreEvent.processor'
import { ExportProcessor } from './processors/export.processor'
import { FiveMEventProcessor } from './processors/fivemEvent.processor'
import { NetEventProcessor } from './processors/netEvent.processor'
import { TickProcessor } from './processors/tick.processor'

export function registerSystemServer() {
  di.register('DecoratorProcessor', { useClass: NetEventProcessor })
  di.register('DecoratorProcessor', { useClass: TickProcessor })
  di.register('DecoratorProcessor', { useClass: ExportProcessor })
  di.register('DecoratorProcessor', { useClass: CoreEventProcessor })
  di.register('DecoratorProcessor', { useClass: CommandProcessor })
  di.register('DecoratorProcessor', { useClass: FiveMEventProcessor })
  if (!di.isRegistered(SecurityHandlerContract as any)) {
    di.registerSingleton(SecurityHandlerContract as any, DefaultSecurityHandler)
  }
}
