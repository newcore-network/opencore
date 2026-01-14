import 'reflect-metadata'
import { METADATA_KEYS } from '../system/metadata-client.keys'

/**
 * Registers a method as a key mapping handler.
 *
 * @remarks
 * This decorator only stores metadata. During bootstrap, the framework registers key mappings
 * and binds the decorated method to the configured key.
 *
 * @param key - Key identifier (depends on the key-mapping layer used by the runtime).
 * @param description - Human-friendly description (typically used in key mapping UIs).
 *
 * @example
 * ```ts
 * @Client.Controller()
 * export class InteractionController {
 *   @Client.Key('E', 'Interact')
 *   interact() {
 *     // ...
 *   }
 * }
 * ```
 */
export function Key(key: string, description: string) {
  return (target: any, propertyKey: string) => {
    Reflect.defineMetadata(METADATA_KEYS.KEY, { key, description }, target, propertyKey)
  }
}
