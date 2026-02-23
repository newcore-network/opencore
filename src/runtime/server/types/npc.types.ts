import { Vector3 } from '../../../kernel/utils/vector3'

export interface NpcMetadata {
  [key: string]: unknown
}

export interface NpcSpawnOptions {
  id?: string
  model: string | number
  position: Vector3
  heading?: number
  networked?: boolean
  pedType?: number
  routingBucket?: number
  persistent?: boolean
  metadata?: NpcMetadata
}

export interface NpcSpawnResult {
  success: boolean
  id?: string
  handle?: number
  netId?: number
  error?: string
}

export interface SerializedNpcData {
  id: string
  handle: number
  netId?: number
  model: string
  modelHash: number
  position: Vector3
  heading: number
  routingBucket: number
  persistent: boolean
  createdAt: number
  meta: Record<string, unknown>
  states: string[]
}
