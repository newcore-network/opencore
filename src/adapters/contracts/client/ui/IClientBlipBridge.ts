import type { Vector3 } from '../../../../kernel/utils/vector3'

export interface ClientBlipOptions {
  icon?: number
  sprite?: number
  color?: number
  scale?: number
  shortRange?: boolean
  label?: string
  alpha?: number
  route?: boolean
  routeColor?: number
  visible?: boolean
}

export interface ClientBlipDefinition extends ClientBlipOptions {
  position?: Vector3
  entity?: number
  radius?: number
}

export abstract class IClientBlipBridge {
  abstract create(id: string, definition: ClientBlipDefinition): void
  abstract update(id: string, patch: Partial<ClientBlipDefinition>): boolean
  abstract exists(id: string): boolean
  abstract remove(id: string): boolean
  abstract clear(): void
}
