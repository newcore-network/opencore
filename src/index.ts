import 'reflect-metadata'

// Schema utilities at root level for convenient imports
// Usage: import { z, Infer } from '@open-core/framework'
export { type Infer, type Input, type Output, z } from './kernel/schema'
export * as Shared from './kernel/shared'
export * as Utils from './kernel/utils'
export * as Client from './runtime/client'
export * as Server from './runtime/server'
