import type { ClassConstructor } from '../system/types'
import { di } from './container'
import { PrincipalProviderContract } from './templates'

export function setAuthProvider(provider: ClassConstructor<PrincipalProviderContract>) {
  di.registerSingleton(PrincipalProviderContract as any, provider)
  console.log(`[CORE] Auth Provider: ${provider.name}`)
}
