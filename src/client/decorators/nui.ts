import { METADATA_KEYS } from '../system/metadata-client.keys'

export function NuiCallback(eventName: string) {
  return (target: any, propertyKey: string) => {
    Reflect.defineMetadata(METADATA_KEYS.NUI, { eventName }, target, propertyKey)
  }
}
