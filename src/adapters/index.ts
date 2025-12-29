// Adapters - External world connections

export * from './contracts/IEngineEvents'
export * from './contracts/IEntityServer'
export * from './contracts/IExports'
export * from './contracts/IHasher'
// Contracts (interfaces)
export * from './contracts/INetTransport'
export * from './contracts/IPedAppearanceClient'
export * from './contracts/IPedAppearanceServer'
export * from './contracts/IPlayerInfo'
export * from './contracts/IPlayerServer'
export * from './contracts/IResourceInfo'
export * from './contracts/ITick'
export * from './contracts/IVehicleServer'
// Database adapters
export { OxMySQLAdapter } from './database/oxmysql.adapter'
export { ResourceDatabaseAdapter } from './database/resource.adapter'
// Capability registration
export * from './register-capabilities'

// FiveM adapters (not exported by default - registered via registerServerCapabilities)
// Node adapters (not exported by default - registered via registerServerCapabilities)
