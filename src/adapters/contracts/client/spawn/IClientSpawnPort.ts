import type { RespawnRequest, SpawnExecutionResult, SpawnRequest, TeleportRequest } from './types'

export abstract class IClientSpawnPort {
  /**
   * Waits until the runtime reports that spawning can safely occur.
   */
  abstract waitUntilReady(timeoutMs?: number): Promise<void>

  /**
   * Performs a full local-player spawn.
   */
  abstract spawn(request: SpawnRequest): Promise<SpawnExecutionResult>

  /**
   * Performs a respawn flow for the local player.
   */
  abstract respawn(request: RespawnRequest): Promise<SpawnExecutionResult>

  /**
   * Repositions the local player without a full spawn sequence.
   */
  abstract teleport(request: TeleportRequest): Promise<void>
}
