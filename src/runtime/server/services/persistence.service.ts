import { injectable } from 'tsyringe'
import { GLOBAL_CONTAINER } from '../../../kernel/di/container'
import { loggers } from '../../../kernel/logger'
import { PlayerPersistenceContract } from '../contracts'
import { Player } from '../entities/player'

/**
 * Internal service that orchestrates player data persistence.
 *
 * This service manages the lifecycle of persistence hooks and auto-save intervals.
 * It is used internally by the framework and should not be instantiated directly.
 */
@injectable()
export class PlayerPersistenceService {
  private provider: PlayerPersistenceContract | null = null
  private autoSaveIntervals = new Map<number, ReturnType<typeof setInterval>>()
  private initialized = false

  /**
   * Initializes the persistence service by resolving the provider from DI.
   * Called during bootstrap if a provider is registered.
   */
  initialize(): void {
    if (this.initialized) return

    try {
      if (GLOBAL_CONTAINER.isRegistered(PlayerPersistenceContract as any)) {
        const provider = GLOBAL_CONTAINER.resolve<PlayerPersistenceContract>(
          PlayerPersistenceContract as any,
        )
        this.provider = provider
        loggers.bootstrap.info('Player Persistence Provider initialized', {
          autoSaveEnabled: provider.config.autoSaveEnabled,
          autoSaveIntervalMs: provider.config.autoSaveIntervalMs,
        })
      }
    } catch {
      // Provider not registered, persistence is disabled
      this.provider = null
    }

    this.initialized = true
  }

  /**
   * Whether persistence is enabled (provider is configured).
   */
  get isEnabled(): boolean {
    return this.provider !== null
  }

  /**
   * Handles player session load - called when a player joins.
   *
   * @param player - The player who just joined
   */
  async handleSessionLoad(player: Player): Promise<void> {
    if (!this.provider) return

    try {
      await this.provider.onSessionLoad(player)
      loggers.session.debug('Player data loaded', { clientId: player.clientID })

      // Start auto-save interval if enabled
      if (this.provider.config.autoSaveEnabled) {
        this.startAutoSave(player)
      }
    } catch (error) {
      loggers.session.error(
        'Failed to load player data',
        { clientId: player.clientID },
        error as Error,
      )
    }
  }

  /**
   * Handles player session save - called when a player disconnects.
   *
   * @param player - The player who is disconnecting
   */
  async handleSessionSave(player: Player): Promise<void> {
    if (!this.provider) return

    // Stop auto-save interval first
    this.stopAutoSave(player.clientID)

    try {
      await this.provider.onSessionSave(player)
      loggers.session.debug('Player data saved', { clientId: player.clientID })
    } catch (error) {
      loggers.session.error(
        'Failed to save player data',
        { clientId: player.clientID },
        error as Error,
      )
    }
  }

  /**
   * Manually triggers a save for a specific player.
   *
   * @param player - The player whose data should be saved
   */
  async savePlayer(player: Player): Promise<void> {
    if (!this.provider) return

    try {
      await this.provider.onSessionSave(player)
      loggers.session.debug('Player data manually saved', { clientId: player.clientID })
    } catch (error) {
      loggers.session.error(
        'Failed to manually save player data',
        { clientId: player.clientID },
        error as Error,
      )
    }
  }

  /**
   * Saves all connected players' data.
   * Useful for server shutdown or periodic global saves.
   *
   * @param players - Array of all connected players
   */
  async saveAllPlayers(players: Player[]): Promise<void> {
    if (!this.provider) return

    const savePromises = players.map((player) =>
      this.provider?.onSessionSave(player).catch((error) => {
        loggers.session.error(
          'Failed to save player data during bulk save',
          { clientId: player.clientID },
          error as Error,
        )
      }),
    )

    await Promise.all(savePromises)
    loggers.session.info('Bulk player save completed', { playerCount: players.length })
  }

  /**
   * Starts the auto-save interval for a player.
   */
  private startAutoSave(player: Player): void {
    if (!this.provider) return

    const intervalMs = this.provider.config.autoSaveIntervalMs
    const interval = setInterval(async () => {
      try {
        await this.provider?.onAutoSave(player)
        loggers.session.debug('Player auto-save completed', { clientId: player.clientID })
      } catch (error) {
        loggers.session.error('Auto-save failed', { clientId: player.clientID }, error as Error)
      }
    }, intervalMs)

    this.autoSaveIntervals.set(player.clientID, interval)
  }

  /**
   * Stops the auto-save interval for a player.
   */
  private stopAutoSave(clientId: number): void {
    const interval = this.autoSaveIntervals.get(clientId)
    if (interval) {
      clearInterval(interval)
      this.autoSaveIntervals.delete(clientId)
    }
  }

  /**
   * Stops all auto-save intervals.
   * Called during server shutdown.
   */
  stopAllAutoSaves(): void {
    for (const interval of this.autoSaveIntervals.values()) {
      clearInterval(interval)
    }
    this.autoSaveIntervals.clear()
  }
}
