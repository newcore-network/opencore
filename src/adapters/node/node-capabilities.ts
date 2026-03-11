import { injectable } from 'tsyringe'
import { IPlatformContext } from '../contracts/IPlatformContext'
import { IdentifierTypes } from '../contracts/types/identifier'

/**
 * Node.js mock platform context implementation.
 * Used for testing and standalone development.
 */
@injectable()
export class NodePlatformContext extends IPlatformContext {
  readonly platformName = 'node'
  readonly displayName = 'Node.js (Mock)'

  readonly identifierTypes = [
    IdentifierTypes.STEAM,
    IdentifierTypes.LICENSE,
    IdentifierTypes.DISCORD,
    IdentifierTypes.IP,
  ] as const

  readonly maxPlayers = undefined
  readonly gameProfile = 'common' as const
  readonly defaultSpawnModel = 'mp_m_freemode_01'
  readonly defaultVehicleType = 'automobile'
  readonly enableServerVehicleCreation = true
}

/**
 * @deprecated Use NodePlatformContext.
 */
export const NodeCapabilities = NodePlatformContext
