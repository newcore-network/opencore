import { GLOBAL_CONTAINER } from '../../../../kernel/di/container'
import { PrincipalProviderContract } from '../../contracts'
import { _mode } from '../../core'
import { getRuntimeContext } from '../../runtime'
import { PlayerDirectoryPort } from '../ports/player-directory.port'

/**
 * Defines the interface for core exports that can be called from the server bridge.
 * These methods are implemented in the core module and provide access to player data.
 */
type CoreExports = {
  /** Gets the player ID for a given client ID */
  getPlayerId(clientID: number): string | undefined

  /** Retrieves metadata for a player by client ID and metadata key */
  getPlayerMeta<T = unknown>(clientID: number, key: string): Promise<T | undefined>

  /** Sets metadata for a player by client ID and key */
  setPlayerMeta(clientID: number, key: string, value: unknown): void

  /** Gets the principal (user identity) for a given client ID */
  getPrincipal(clientID: number): Promise<any>
}

/**
 * Server bridge provides a unified interface to interact with player data
 * regardless of whether the code is running in CORE mode or not.
 * It automatically routes calls to the appropriate implementation.
 */
export const serverBridge = {
  /**
   * Gets the player ID for a given client ID
   * @param clientID - The client ID to look up
   * @returns The player ID if found, null otherwise
   */
  getPlayerId(clientID: number): string | undefined {
    if (_mode !== 'RESOURCE') {
      return getPlayerService().getPlayerId(clientID)
    }
    return getCoreExports().getPlayerId(clientID)
  },

  /**
   * Retrieves metadata for a player
   * @template T - The expected type of the metadata value
   * @param clientID - The client ID of the player
   * @param key - The metadata key to retrieve
   * @returns A promise that resolves with the metadata value, or undefined if not found
   */
  async getPlayerMeta<T = unknown>(clientID: number, key: string): Promise<T | undefined> {
    if (_mode !== 'RESOURCE') {
      return getPlayerService().getMeta<T>(clientID, key)
    }
    return getCoreExports().getPlayerMeta<T>(clientID, key)
  },

  /**
   * Sets metadata for a player
   * @param clientID - The client ID of the player
   * @param key - The metadata key to set
   * @param value - The value to store
   */
  setPlayerMeta(clientID: number, key: string, value: unknown): void {
    if (_mode !== 'RESOURCE') {
      getPlayerService().setMeta(clientID, key, value)
      return
    }
    getCoreExports().setPlayerMeta(clientID, key, value)
  },

  /**
   * Gets the principal (user identity) for a client
   * @param clientID - The client ID to look up
   * @returns A promise that resolves with the principal object, or null if not found
   */
  async getPrincipal(clientID: number): Promise<any> {
    if (_mode !== 'RESOURCE') {
      const player = getPlayerService().getByClient(clientID)
      if (!player) return null
      return getPrincipalProvider().getPrincipal(player)
    }
    return getCoreExports().getPrincipal(clientID)
  },
}

/**
 * Gets the core exports interface from the global scope
 * @returns The CoreExports interface implementation
 * @throws Error if core exports are not available
 */
function getCoreExports(): CoreExports {
  const { coreResourceName } = getRuntimeContext()
  const core = (globalThis as any).exports?.[coreResourceName] as CoreExports | undefined
  if (!core) {
    throw new Error(
      `[OpenCore] Core exports are unavailable for resource '${coreResourceName}'. Is the core resource loaded?`,
    )
  }
  return core
}

/**
 * Gets the player service from the dependency injection container
 * @returns An instance of PlayerServiceContract
 */
function getPlayerService(): PlayerDirectoryPort {
  return GLOBAL_CONTAINER.resolve(PlayerDirectoryPort as any) as PlayerDirectoryPort
}

/**
 * Gets the principal provider from the dependency injection container
 * @returns An instance of PrincipalProviderContract
 */
function getPrincipalProvider(): PrincipalProviderContract {
  return GLOBAL_CONTAINER.resolve(PrincipalProviderContract as any) as PrincipalProviderContract
}
