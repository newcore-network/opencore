import { METADATA_KEYS } from '../system/metadata-client.keys'

/**
 * Decorator for handling local events (non-networked).
 * Use this for client-side only events.
 *
 * @param eventName - The name of the local event to listen for
 */
export function OnLocalEvent(eventName: string) {
  return (target: any, propertyKey: string) => {
    Reflect.defineMetadata(METADATA_KEYS.LOCAL_EVENT, { eventName }, target, propertyKey)
  }
}
