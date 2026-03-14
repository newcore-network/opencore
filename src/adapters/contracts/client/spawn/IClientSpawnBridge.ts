import type { RespawnRequest, SpawnRequest, TeleportRequest } from './types'

export abstract class IClientSpawnBridge {
  abstract waitUntilReady(timeoutMs?: number): Promise<void>
  abstract spawn(request: SpawnRequest): Promise<void>
  abstract respawn(request: RespawnRequest): Promise<void>
  abstract teleport(request: TeleportRequest): Promise<void>
}
