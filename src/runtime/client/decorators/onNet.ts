import { METADATA_KEYS } from '../system/metadata-client.keys'

export function OnNet(eventName: string) {
  return (target: any, propertyKey: string) => {
    Reflect.defineMetadata(METADATA_KEYS.NET_EVENT, { eventName }, target, propertyKey)
  }
}
