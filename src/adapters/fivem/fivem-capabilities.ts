import { injectable } from 'tsyringe'
import { IPlatformCapabilities, PlatformFeatures } from '../contracts/IPlatformCapabilities'
import { IdentifierTypes } from '../contracts/types/identifier'

/**
 * FiveM platform capabilities implementation.
 */
@injectable()
export class FiveMCapabilities extends IPlatformCapabilities {
  readonly platformName = 'fivem'
  readonly displayName = 'FiveM'

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
  ] as const

  readonly maxPlayers = 1024

  private readonly supportedFeatures = new Set<string>([
    PlatformFeatures.ROUTING_BUCKETS,
    PlatformFeatures.STATE_BAGS,
    PlatformFeatures.VOICE_CHAT,
    PlatformFeatures.SERVER_ENTITIES,
    PlatformFeatures.VEHICLE_MODS,
    PlatformFeatures.PED_APPEARANCE,
    PlatformFeatures.WEAPON_COMPONENTS,
    PlatformFeatures.BLIPS,
    PlatformFeatures.MARKERS,
    PlatformFeatures.TEXT_LABELS,
    PlatformFeatures.CHECKPOINTS,
    PlatformFeatures.COLSHAPES,
  ])

  private readonly config: Record<string, unknown> = {
    defaultRoutingBucket: 0,
    maxRoutingBuckets: 63,
    tickRate: 64,
    syncRate: 10,
  }

  isFeatureSupported(feature: string): boolean {
    return this.supportedFeatures.has(feature)
  }

  getConfig<T = unknown>(key: string): T | undefined {
    return this.config[key] as T | undefined
  }
}
