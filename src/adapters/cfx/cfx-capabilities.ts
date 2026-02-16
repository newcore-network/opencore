import { injectable } from 'tsyringe'
import { IPlatformCapabilities, PlatformFeatures } from '../contracts/IPlatformCapabilities'
import { IdentifierTypes } from '../contracts/types/identifier'
import { detectCfxGameProfile } from './runtime-profile'

@injectable()
export class CfxCapabilities extends IPlatformCapabilities {
  readonly platformName = 'cfx'
  readonly displayName = 'CitizenFX'

  private readonly gameProfile = detectCfxGameProfile()

  readonly supportsRoutingBuckets = true
  readonly supportsStateBags = true
  readonly supportsVoiceChat = true
  readonly supportsServerEntities = true

  readonly identifierTypes = [
    IdentifierTypes.STEAM,
    IdentifierTypes.LICENSE,
    IdentifierTypes.LICENSE2,
    IdentifierTypes.DISCORD,
    IdentifierTypes.FIVEM,
    IdentifierTypes.XBL,
    IdentifierTypes.LIVE,
    IdentifierTypes.IP,
    IdentifierTypes.ROCKSTAR,
  ] as const

  readonly maxPlayers = 1024

  private readonly supportedFeatures = new Set<string>([
    PlatformFeatures.ROUTING_BUCKETS,
    PlatformFeatures.STATE_BAGS,
    PlatformFeatures.VOICE_CHAT,
    PlatformFeatures.SERVER_ENTITIES,
    PlatformFeatures.BLIPS,
    PlatformFeatures.MARKERS,
    PlatformFeatures.TEXT_LABELS,
    PlatformFeatures.CHECKPOINTS,
    PlatformFeatures.COLSHAPES,
    ...(this.gameProfile === 'gta5'
      ? [
          PlatformFeatures.VEHICLE_MODS,
          PlatformFeatures.PED_APPEARANCE,
          PlatformFeatures.WEAPON_COMPONENTS,
        ]
      : []),
  ])

  private readonly config: Record<string, unknown> = {
    runtime: 'cfx',
    gameProfile: this.gameProfile,
    defaultRoutingBucket: 0,
    maxRoutingBuckets: 63,
    tickRate: 64,
    syncRate: 10,
    defaultSpawnModel: this.gameProfile === 'rdr3' ? 'mp_male' : 'mp_m_freemode_01',
    enableServerVehicleCreation: this.gameProfile !== 'rdr3',
    defaultVehicleType: this.gameProfile === 'rdr3' ? 'automobile' : 'automobile',
  }

  isFeatureSupported(feature: string): boolean {
    return this.supportedFeatures.has(feature)
  }

  getConfig<T = unknown>(key: string): T | undefined {
    return this.config[key] as T | undefined
  }
}
