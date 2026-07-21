import { createBindingDecorator, type BindingScope } from '../../shared/di/binding'

/**
 * Supported binding scopes for {@link Bind}.
 */
export type { BindingScope } from '../../shared/di/binding'

/**
 * Marks a class as injectable and binds it into the framework DI container.
 *
 * @remarks
 * - This decorator is a small wrapper around tsyringe's `@injectable()` plus a lifecycle binding.
 * - Use `singleton` for shared stateless/stateful services.
 * - Use `transient` when you want a new instance per resolution scope.
 *
 * @param scope - Binding scope. Defaults to `singleton`.
 *
 * @example
 * ```ts
 * @Server.Bind('singleton')
 * export class InventoryService {}
 * ```
 */
export function Bind(scope: BindingScope = 'singleton') {
  return createBindingDecorator(scope)
}
