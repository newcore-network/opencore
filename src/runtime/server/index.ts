// Framework modules
export * from './core'
export * from './runtime'
export * from './decorators'
export * from './templates'
export * from './services'

// Entities
export * from './entities'

// Configs
export * from './configs'
export * from './setup'

// Types
export type * from './types/core-events'

export * from './bootstrap.validation'

import { di } from '../../kernel/di/container'
globalThis.oc_container = di
