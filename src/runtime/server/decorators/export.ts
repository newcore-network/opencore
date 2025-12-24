import { METADATA_KEYS } from '../system/metadata-server.keys'

/**
 * Exposes a method as a FiveM server export.
 *
 * @remarks
 * This decorator only stores metadata. During bootstrap, the framework registers the export so that
 * other resources can call it via `exports['resourceName'][exportName](...)`.
 *
 * @param name - Optional export name. If omitted, the method name is used.
 *
 * @example
 * ```ts
 * @Server.Controller()
 * export class AccountController {
 *   @Server.Export('getAccountById')
 *   getAccountById(id: string) {
 *     return this.accountService.find(id)
 *   }
 * }
 *
 * // From another resource:
 * // const result = exports['core-resource'].getAccountById('1234')
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
