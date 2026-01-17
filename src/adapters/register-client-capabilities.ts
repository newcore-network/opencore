import { di } from '../runtime/client/client-container'
import { IPedAppearanceClient } from './contracts/client/IPedAppearanceClient'
import { IHasher } from './contracts/IHasher'

/**
 * Registers client-side platform-specific capability implementations.
 *
 * @remarks
 * This function registers adapters needed by the CLIENT runtime only.
 * Should be called during client bootstrap before services that depend on these adapters.
 */
export async function registerClientCapabilities(): Promise<void> {
  const [{ FiveMPedAppearanceClientAdapter }, { FiveMHasher }] = await Promise.all([
    import('./fivem/fivem-ped-appearance-client'),
    import('./fivem/fivem-hasher'),
  ])

  if (!di.isRegistered(IPedAppearanceClient as any))
    di.registerSingleton(IPedAppearanceClient as any, FiveMPedAppearanceClientAdapter)
  if (!di.isRegistered(IHasher as any)) di.registerSingleton(IHasher as any, FiveMHasher)
}
