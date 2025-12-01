import 'reflect-metadata'
import { METADATA_KEYS } from '../system/metadata-client.keys'

export function KeyMapping(key: string, description: string) {
  return (target: any, propertyKey: string) => {
    Reflect.defineMetadata(METADATA_KEYS.KEY, { key, description }, target, propertyKey)
  }
}
