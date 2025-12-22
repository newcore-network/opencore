// Adapters - External world connections

// Capability registration
export * from './register-capabilities'

// Contracts (interfaces)
export * from './contracts/INetTransport'
export * from './contracts/IEngineEvents'
export * from './contracts/IExports'
export * from './contracts/IResourceInfo'
export * from './contracts/ITick'

// Database adapters
export { OxMySQLAdapter } from './database/oxmysql.adapter'
export { ResourceDatabaseAdapter } from './database/resource.adapter'

// FiveM adapters (not exported by default - registered via registerServerCapabilities)
// Node adapters (not exported by default - registered via registerServerCapabilities)
