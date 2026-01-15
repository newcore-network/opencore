import { injectable } from 'tsyringe'
import { IPlatformCapabilities, PlatformFeatures } from '../contracts/IPlatformCapabilities'
import { IdentifierTypes } from '../contracts/types/identifier'

/**
 * Node.js mock platform capabilities implementation.
 * Used for testing and standalone development.
 */
@injectable()
export class NodeCapabilities extends IPlatformCapabilities {
  readonly platformName = 'node'
  readonly displayName = 'Node.js (Mock)'

  readonly supportsRoutingBuckets = true // Mocked
  readonly supportsStateBags = true // Mocked
  readonly supportsVoiceChat = false
  readonly supportsServerEntities = true // Mocked

  readonly identifierTypes = [
    IdentifierTypes.STEAM,
    IdentifierTypes.LICENSE,
    IdentifierTypes.DISCORD,
    IdentifierTypes.IP,
  ] as const

  readonly maxPlayers = undefined // Unlimited in mock mode

  private readonly supportedFeatures = new Set<string>([
    PlatformFeatures.ROUTING_BUCKETS,
    PlatformFeatures.STATE_BAGS,
    PlatformFeatures.SERVER_ENTITIES,
    // Note: Other features are not mocked
  ])

  private readonly config: Record<string, unknown> = {
    mockMode: true,
    defaultRoutingBucket: 0,
  }

  isFeatureSupported(feature: string): boolean {
    return this.supportedFeatures.has(feature)
  }

  getConfig<T = unknown>(key: string): T | undefined {
    return this.config[key] as T | undefined
  }
}
