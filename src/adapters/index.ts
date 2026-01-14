// Adapters - External world connections

export * from './contracts/client/IPedAppearanceClient'
export * from './contracts/IEngineEvents'
export * from './contracts/IExports'
export * from './contracts/IHasher'
// Contracts (interfaces)
export * from './contracts/INetTransport'
export * from './contracts/IPlayerInfo'
export * from './contracts/IResourceInfo'
export * from './contracts/ITick'
export * from './contracts/server/IEntityServer'
export * from './contracts/server/IPedAppearanceServer'
export * from './contracts/server/IPlayerServer'
export * from './contracts/server/IVehicleServer'
// Database adapters
export { OxMySQLAdapter } from './database/oxmysql.adapter'
export { ResourceDatabaseAdapter } from './database/resource.adapter'
// Capability registration
export * from './register-capabilities'

// FiveM adapters (not exported by default - registered via registerServerCapabilities)
// Node adapters (not exported by default - registered via registerServerCapabilities)
