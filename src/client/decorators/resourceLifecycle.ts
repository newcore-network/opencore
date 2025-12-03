import { METADATA_KEYS } from '../system/metadata-client.keys'

/**
 * Decorator for handling resource start events.
 * Called when this resource starts.
 */
export function OnResourceStart() {
  return (target: any, propertyKey: string) => {
    Reflect.defineMetadata(METADATA_KEYS.RESOURCE_START, {}, target, propertyKey)
  }
}

/**
 * Decorator for handling resource stop events.
 * Called when this resource is about to stop.
 * Useful for cleanup operations.
 */
export function OnResourceStop() {
  return (target: any, propertyKey: string) => {
    Reflect.defineMetadata(METADATA_KEYS.RESOURCE_STOP, {}, target, propertyKey)
  }
}

