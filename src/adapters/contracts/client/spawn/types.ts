import type { Vector3 } from '../../../../kernel/utils/vector3'

export interface SpawnRequest {
  position: Vector3
  model: string
  heading?: number
}

export interface SpawnExecutionResult {
  localPlayerHandle?: number
}

export interface TeleportRequest {
  position: Vector3
  heading?: number
}

export interface RespawnRequest {
  position: Vector3
  heading?: number
}
