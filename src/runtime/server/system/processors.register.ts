import { di } from '../../../kernel/di/index'
import { NetEventSecurityObserverContract } from '../contracts/security/net-event-security-observer.contract'
import { SecurityHandlerContract } from '../contracts/security/security-handler.contract'
import type { RuntimeContext } from '../runtime'
import { DefaultNetEventSecurityObserver } from '../services/default/default-net-event-security-observer'
import { DefaultSecurityHandler } from '../services/default/default-security.handler'
import { CommandProcessor } from './processors/command.processor'
import { CoreEventProcessor } from './processors/coreEvent.processor'
import { ExportProcessor } from './processors/export.processor'
import { FiveMEventProcessor } from './processors/fivemEvent.processor'
import { NetEventProcessor } from './processors/netEvent.processor'
import { TickProcessor } from './processors/tick.processor'

export function registerSystemServer(ctx: RuntimeContext) {
  const { features } = ctx

  if (features.netEvents.enabled) {
    di.register('DecoratorProcessor', { useClass: NetEventProcessor })

    if (!di.isRegistered(SecurityHandlerContract as any)) {
      di.registerSingleton(SecurityHandlerContract as any, DefaultSecurityHandler)
    }
    if (!di.isRegistered(NetEventSecurityObserverContract as any)) {
      di.registerSingleton(NetEventSecurityObserverContract as any, DefaultNetEventSecurityObserver)
    }
  }

  di.register('DecoratorProcessor', { useClass: TickProcessor })

  if (features.exports.enabled) {
    di.register('DecoratorProcessor', { useClass: ExportProcessor })
  }

  di.register('DecoratorProcessor', { useClass: CoreEventProcessor })

  if (features.commands.enabled) {
    di.register('DecoratorProcessor', { useClass: CommandProcessor })
  }

  if (features.fiveMEvents.enabled) {
    di.register('DecoratorProcessor', { useClass: FiveMEventProcessor })
  }
}
