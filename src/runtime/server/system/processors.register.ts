import { DI_TOKENS, di } from '../../../kernel/di/index'
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
    di.register(DI_TOKENS.DecoratorProcessor, { useClass: NetEventProcessor })

    if (!di.isRegistered(SecurityHandlerContract as any)) {
      di.registerSingleton(SecurityHandlerContract as any, DefaultSecurityHandler)
    }
    if (!di.isRegistered(NetEventSecurityObserverContract as any)) {
      di.registerSingleton(NetEventSecurityObserverContract as any, DefaultNetEventSecurityObserver)
    }
  }

  di.register(DI_TOKENS.DecoratorProcessor, { useClass: TickProcessor })

  if (features.exports.enabled) {
    di.register(DI_TOKENS.DecoratorProcessor, { useClass: ExportProcessor })
  }

  di.register(DI_TOKENS.DecoratorProcessor, { useClass: CoreEventProcessor })

  if (features.commands.enabled) {
    di.register(DI_TOKENS.DecoratorProcessor, { useClass: CommandProcessor })
  }

  if (features.fiveMEvents.enabled) {
    di.register(DI_TOKENS.DecoratorProcessor, { useClass: FiveMEventProcessor })
  }
}
