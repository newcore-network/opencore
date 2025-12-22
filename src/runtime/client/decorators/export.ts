import { METADATA_KEYS } from '../system/metadata-client.keys'

/**
 * Exposes a method as a FiveM client export.
 *
 * @remarks
 * This decorator only stores metadata. During bootstrap, the framework registers the export so that
 * other resources can call it via `exports['resourceName'][exportName](...)`.
 *
 * @param name - Optional export name. If omitted, the method name is used.
 *
 * @example
 * ```ts
 * @Client.Controller()
 * export class UiExports {
 *   @Client.Export('setHudVisible')
 *   setHudVisible(visible: boolean) {
 *     // ...
 *   }
 * }
 * ```
 */
export function Export(name?: string) {
  return (target: any, propertyKey: string) => {
    Reflect.defineMetadata(
      METADATA_KEYS.EXPORT,
      { exportName: name || propertyKey },
      target,
      propertyKey,
    )
  }
}
