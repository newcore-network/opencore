import { METADATA_KEYS } from '../system/metadata-server.keys'

export function OnTick() {
  return (target: any, propertyKey: string) => {
    Reflect.defineMetadata(METADATA_KEYS.TICK, {}, target, propertyKey)
  }
}
