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

// Controllers
import './controllers/command.controller'
import './controllers/chat.controller'
import './controllers/session.controller'
import './controllers/player-export.controller'

import { di } from './container'
globalThis.oc_container = di
