import { GLOBAL_CONTAINER } from '../../../kernel/di/index'
import { CommandErrorObserverContract } from '../contracts/security/command-error-observer.contract'
import { NetEventSecurityObserverContract } from '../contracts/security/net-event-security-observer.contract'
import { SecurityHandlerContract } from '../contracts/security/security-handler.contract'
import { RuntimeContext } from '../runtime'
import { DefaultCommandErrorObserver } from '../default/default-command-error-observer'
import { DefaultNetEventSecurityObserver } from '../default/default-net-event-security-observer'
import { DefaultSecurityHandler } from '../default/default-security.handler'
import { CommandProcessor } from './processors/command.processor'
import { ExportProcessor } from './processors/export.processor'
import { InternalEventProcessor } from './processors/internalEvent.processor'
import { NetEventProcessor } from './processors/netEvent.processor'
import { RuntimeEventProcessor } from './processors/runtimeEvent.processor'
import { TickProcessor } from './processors/tick.processor'

export function registerSystemServer(ctx: RuntimeContext) {
  const { features } = ctx

  if (features.netEvents.enabled) {
    GLOBAL_CONTAINER.register('DecoratorProcessor', { useClass: NetEventProcessor })

    if (!GLOBAL_CONTAINER.isRegistered(SecurityHandlerContract as any)) {
      GLOBAL_CONTAINER.registerSingleton(SecurityHandlerContract as any, DefaultSecurityHandler)
    }
    if (!GLOBAL_CONTAINER.isRegistered(NetEventSecurityObserverContract as any)) {
      GLOBAL_CONTAINER.registerSingleton(
        NetEventSecurityObserverContract as any,
        DefaultNetEventSecurityObserver,
      )
    }
  }

  GLOBAL_CONTAINER.register('DecoratorProcessor', { useClass: TickProcessor })

  if (features.exports.enabled) {
    GLOBAL_CONTAINER.register('DecoratorProcessor', { useClass: ExportProcessor })
  }

  GLOBAL_CONTAINER.register('DecoratorProcessor', { useClass: InternalEventProcessor })

  if (features.commands.enabled) {
    GLOBAL_CONTAINER.register('DecoratorProcessor', { useClass: CommandProcessor })

    if (!GLOBAL_CONTAINER.isRegistered(CommandErrorObserverContract as any)) {
      GLOBAL_CONTAINER.registerSingleton(
        CommandErrorObserverContract as any,
        DefaultCommandErrorObserver,
      )
    }
  }

  if (features.fiveMEvents.enabled) {
    GLOBAL_CONTAINER.register('DecoratorProcessor', { useClass: RuntimeEventProcessor })
  }
}
