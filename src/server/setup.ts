import type { ClassConstructor } from '../system/class-constructor'
import { di } from './container'
import { PrincipalProviderContract } from './templates'
import { SecurityHandlerContract } from './templates/security/security-handler.contract'

export function setAuthProvider(provider: ClassConstructor<PrincipalProviderContract>) {
  di.registerSingleton(PrincipalProviderContract as any, provider)
  console.log(`[CORE] Auth Provider: ${provider.name}`)
}

export function setSecurityHandler(handler: ClassConstructor<SecurityHandlerContract>) {
  di.registerSingleton(SecurityHandlerContract as any, handler)
  console.log(`[CORE] Security Handler: ${handler.name}`)
}
