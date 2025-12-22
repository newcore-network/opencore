import { METADATA_KEYS } from '../system/metadata-client.keys'

/**
 * Decorator to expose a method as a client export.
 * Other resources can call this via exports['resourceName']['exportName']()
 *
 * @param name - Optional custom export name. Defaults to method name.
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
