import type { ClassConstructor } from '../../kernel/di/class-constructor'
import { di } from '../../kernel/di/container'
import { SecurityHandlerContract } from './contracts/security/security-handler.contract'
import { loggers } from '../../kernel/shared/logger'
import { AuthProviderContract } from './contracts/auth-provider.contract'
import { NetEventSecurityObserverContract } from './contracts/security/net-event-security-observer.contract'
import { PlayerPersistenceContract, PrincipalProviderContract } from './contracts'

export function setPrincipalProvider(provider: ClassConstructor<PrincipalProviderContract>) {
  di.registerSingleton(PrincipalProviderContract as any, provider)
  loggers.bootstrap.info(`Principal Provider configured: ${provider.name}`)
}

export function setAuthProvider(provider: ClassConstructor<AuthProviderContract>) {
  di.registerSingleton(AuthProviderContract as any, provider)
  loggers.bootstrap.info(`Auth Provider configured: ${provider.name}`)
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
