import type { ClassConstructor } from '../system/class-constructor'
import { di } from './container'
import { PrincipalProviderContract } from './templates'
import { SecurityHandlerContract } from './templates/security/security-handler.contract'
import { loggers } from '../shared/logger'

export function setAuthProvider(provider: ClassConstructor<PrincipalProviderContract>) {
  di.registerSingleton(PrincipalProviderContract as any, provider)
  loggers.bootstrap.info(`Auth Provider configured: ${provider.name}`)
}

export function setSecurityHandler(handler: ClassConstructor<SecurityHandlerContract>) {
  di.registerSingleton(SecurityHandlerContract as any, handler)
  loggers.bootstrap.info(`Security Handler configured: ${handler.name}`)
}
