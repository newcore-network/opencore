import 'reflect-metadata'

export * as Utils from './kernel/utils'
export * as Shared from './kernel/shared'

export * as Server from './runtime/server'
export * as Client from './runtime/client'

// Schema utilities at root level for convenient imports
// Usage: import { z, Infer } from '@open-core/framework'
export { z, type Infer, type Input, type Output } from './kernel/schema'
