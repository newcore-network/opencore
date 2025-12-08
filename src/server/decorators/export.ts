import { METADATA_KEYS } from '../system/metadata-server.keys'

/**
 * Export
 * -----------------------------------------
 * Declares a method as an externally accessible export
 * within the FiveM environment.
 *
 * Methods decorated with `@Export()` are automatically
 * registered by the framework and exposed as native
 * FXServer exports, allowing other resources to call them
 * using:
 *
 *   exports.resourceName.exportName(...)
 *
 * This decorator is typically used inside controller
 * classes, where the framework’s module loader inspects
 * metadata to register commands, events and exports
 * consistently.
 *
 * @param name Optional name to expose. If omitted,
 *             the method name is used.
 *
 * ```ts
 * @Server.Controller()
 * export class AccountController {
 *   @Server.Export('getAccountById')
 *   getAccount(id: string) {
 *     return this.accountService.find(id)
 *   }
 * }
 *
 * // From another resource:
 * // const result = exports['core-resource'].getAccountById('1234')
 *```
 * Internally, this decorator stores metadata used by
 * the server bootstrap to automatically register the
 * export through FXServer's `global.exports` API.
 *
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
