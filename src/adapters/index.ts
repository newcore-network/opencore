// Adapters - External world connections

// Client contracts
export * from './contracts/client/IPedAppearanceClient'

// Core contracts
export * from './contracts/IEngineEvents'
export * from './contracts/IExports'
export * from './contracts/IHasher'
export * from './contracts/INetTransport'
export * from './contracts/IPlatformCapabilities'
export * from './contracts/IPlayerInfo'
export * from './contracts/IResourceInfo'
export * from './contracts/ITick'

// Server contracts
export * from './contracts/server/IEntityServer'
export * from './contracts/server/IPedAppearanceServer'
export * from './contracts/server/IPlayerServer'
export * from './contracts/server/IVehicleServer'

// Types
export * from './contracts/types/identifier'
// Platform registry
export * from './platform/platform-registry'

// Capability registration
export * from './register-capabilities'

// FiveM adapters (not exported by default - registered via registerServerCapabilities)
// Node adapters (not exported by default - registered via registerServerCapabilities)
