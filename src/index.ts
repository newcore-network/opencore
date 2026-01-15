import 'reflect-metadata'

export * from './kernel'
// Schema utilities at root level for convenient imports
// Usage: import { z, Infer } from '@open-core/framework'
export { type Infer, type Input, type Output, z } from './kernel/schema'
export * from './runtime/core'
