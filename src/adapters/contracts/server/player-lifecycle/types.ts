import type { PlayerAppearance } from '../../../../kernel'
import type { Vector3 } from '../../../../kernel/utils/vector3'

export interface SpawnPlayerRequest {
  position: Vector3
  model?: string
  heading?: number
  appearance?: PlayerAppearance
  skipLoadingScreenShutdown?: boolean
}

export interface TeleportPlayerRequest {
  position: Vector3
  heading?: number
}

export interface RespawnPlayerRequest {
  position: Vector3
  heading?: number
  model?: string
}
