import { ClassConstructor, di } from '../../kernel/di/index'
import { loggers } from '../../kernel/shared/logger'
import { PlayerPersistenceContract, PrincipalProviderContract } from './contracts'
import { NetEventSecurityObserverContract } from './contracts/security/net-event-security-observer.contract'
import { SecurityHandlerContract } from './contracts/security/security-handler.contract'

export function setPrincipalProvider(provider: ClassConstructor<PrincipalProviderContract>) {
  di.registerSingleton(PrincipalProviderContract as any, provider)
  loggers.bootstrap.info(`Principal Provider configured: ${provider.name}`)
}

export function setSecurityHandler(handler: ClassConstructor<SecurityHandlerContract>) {
  di.registerSingleton(SecurityHandlerContract as any, handler)
  loggers.bootstrap.info(`Security Handler configured: ${handler.name}`)
}

export function setPersistenceProvider(provider: ClassConstructor<PlayerPersistenceContract>) {
  di.registerSingleton(PlayerPersistenceContract as any, provider)
  loggers.bootstrap.info(`Persistence Provider configured: ${provider.name}`)
}

export function setNetEventSecurityObserver(
  observer: ClassConstructor<NetEventSecurityObserverContract>,
) {
  di.registerSingleton(NetEventSecurityObserverContract as any, observer)
  loggers.bootstrap.info(`NetEvent Security Observer configured: ${observer.name}`)
}
