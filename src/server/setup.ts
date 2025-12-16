import type { ClassConstructor } from '../system/class-constructor'
import { di } from './container'
import { PrincipalProviderContract } from './templates'
import { SecurityHandlerContract } from './templates/security/security-handler.contract'
import { PlayerPersistenceContract } from './templates/persistence'
import { loggers } from '../shared/logger'
import { AuthProviderContract } from './templates/auth/auth-provider.contract'
import { NetEventSecurityObserverContract } from './templates/security/net-event-security-observer.contract'

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
