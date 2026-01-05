// Framework modules

export * from './bootstrap.validation'
// Configs
export * from './configs'
export * from './contracts/index'
export { init } from './core'
export * from './decorators'
// DevMode (development tools)
export * from './devmode'
// Entities
export * from './entities'
export * from './runtime'
export * from './services'
export * from './setup'
export * from './templates'
// Types
export type * from './types/internal-events'

import { di } from '../../kernel/di/container'

globalThis.oc_container = di
