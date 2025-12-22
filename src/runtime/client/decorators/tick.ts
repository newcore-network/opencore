import { METADATA_KEYS } from '../system/metadata-client.keys'

export function Tick() {
  return (target: any, propertyKey: string) => {
    Reflect.defineMetadata(METADATA_KEYS.TICK, {}, target, propertyKey)
  }
}
