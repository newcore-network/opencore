// Framework modules
export * from './core'
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

import './controllers/player-export.controller'
import './controllers/principal-export.controller'
export * from './bootstrap.validation'

import { di } from './container'
globalThis.oc_container = di
