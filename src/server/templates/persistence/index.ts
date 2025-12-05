/**
 * Player Persistence Module
 *
 * Provides contracts and types for implementing player data persistence.
 *
 * @example
 * ```typescript
 * import {
 *   PlayerPersistenceContract,
 *   PersistenceConfig,
 *   DEFAULT_PERSISTENCE_CONFIG
 * } from '@open-core/framework/server'
 *
 * class MyPersistenceProvider extends PlayerPersistenceContract {
 *   readonly config: PersistenceConfig = {
 *     ...DEFAULT_PERSISTENCE_CONFIG,
 *     autoSaveIntervalMs: 60000, // Override to 1 minute
 *   }
 *
 *   async onSessionLoad(player) { ... }
 *   async onSessionSave(player) { ... }
 *   async onAutoSave(player) { ... }
 * }
 *
 * // In your setup:
 * Server.setPersistenceProvider(MyPersistenceProvider)
 * ```
 */

export {
  PlayerPersistenceContract,
  DEFAULT_PERSISTENCE_CONFIG,
} from './player-persistence.contract'

export type { PersistenceConfig } from './player-persistence.contract'
