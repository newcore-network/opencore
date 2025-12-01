import { METADATA_KEYS } from '../system/metadata-server.keys'
import type { CoreEventMap } from '../types/core-events'

export function OnCoreEvent<K extends keyof CoreEventMap>(event: K) {
  return (target: any, propertyKey: string) => {
    Reflect.defineMetadata(METADATA_KEYS.CORE_EVENT, { event }, target, propertyKey)
  }
}
