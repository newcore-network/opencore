import type { RespawnPlayerRequest, SpawnPlayerRequest, TeleportPlayerRequest } from './types'

export abstract class IPlayerLifecycleServer {
  abstract spawn(playerSrc: string, request: SpawnPlayerRequest): Promise<void> | void
  abstract teleport(playerSrc: string, request: TeleportPlayerRequest): Promise<void> | void
  abstract respawn(playerSrc: string, request: RespawnPlayerRequest): Promise<void> | void
}
