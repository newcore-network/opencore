// Framework modules

export * from './bootstrap.validation'
// Configs
export * from './configs'
export * from './contracts/index'
export { init } from './core'
export * from './decorators'
// Entities
export * from './entities'
export * from './runtime'
export * from './services'
export * from './setup'
export * from './templates'
// Types
export type * from './types/core-events'

import { di } from '../../kernel/di/container'

globalThis.oc_container = di
