import type { Player } from '../entities'

/**
 * Configuration for player data persistence behavior.
 */
export interface PersistenceConfig {
  /**
   * Whether automatic saving is enabled.
   * When true, player data will be saved periodically.
   */
  autoSaveEnabled: boolean

  /**
   * Interval in milliseconds between auto-saves.
   * @default 300000 (5 minutes)
   */
  autoSaveIntervalMs: number
}

/**
 * Default persistence configuration values.
 */
export const DEFAULT_PERSISTENCE_CONFIG: PersistenceConfig = {
  autoSaveEnabled: true,
  autoSaveIntervalMs: 300000, // 5 minutes
}

/**
 * Player Persistence Contract
 *
 * Abstract base class for implementing player data persistence.
 * Implement this contract to define how player data is loaded, saved,
 * and automatically persisted during their session.
 *
 * @example
 * ```typescript
 * import { PlayerPersistenceContract, PersistenceConfig } from '@open-core/framework/server'
 *
 * class MyPersistenceProvider extends PlayerPersistenceContract {
 *   readonly config: PersistenceConfig = {
 *     autoSaveEnabled: true,
 *     autoSaveIntervalMs: 300000, // 5 minutes
 *   }
 *
 *   async onSessionLoad(player: Player): Promise<void> {
 *     const data = await this.db.single('SELECT * FROM players WHERE license = ?', [player.license])
 *     if (data) {
 *       player.setMeta('money', data.money)
 *       player.setMeta('job', data.job)
 *     }
 *   }
 *
 *   async onSessionSave(player: Player): Promise<void> {
 *     await this.db.execute(
 *       'UPDATE players SET money = ?, job = ? WHERE license = ?',
 *       [player.getMeta('money'), player.getMeta('job'), player.license]
 *     )
 *   }
 *
 *   async onAutoSave(player: Player): Promise<void> {
 *     // Can delegate to onSessionSave or implement lighter save logic
 *     await this.onSessionSave(player)
 *   }
 * }
 * ```
 */
export abstract class PlayerPersistenceContract {
  /**
   * Persistence configuration for this provider.
   */
  abstract readonly config: PersistenceConfig

  /**
   * Called when a player session is created (after playerJoining).
   * Load saved data from persistent storage and attach to the player.
   *
   * @param player - The player whose data should be loaded
   */
  abstract onSessionLoad(player: Player): Promise<void>

  /**
   * Called when a player disconnects (before session destroy).
   * Save player data to persistent storage.
   *
   * @param player - The player whose data should be saved
   */
  abstract onSessionSave(player: Player): Promise<void>

  /**
   * Called periodically if autoSave is enabled.
   * Can implement lighter save logic or delegate to onSessionSave.
   *
   * @param player - The player whose data should be auto-saved
   */
  abstract onAutoSave(player: Player): Promise<void>
}
