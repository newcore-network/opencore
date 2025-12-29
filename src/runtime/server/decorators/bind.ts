import { injectable, Lifecycle, scoped, singleton } from 'tsyringe'

/**
 * Supported binding scopes for {@link Bind}.
 */
export type BindingScope = 'singleton' | 'transient'

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
  return (target: any) => {
    injectable()(target)

    if (scope === 'singleton') {
      singleton()(target)
    } else {
      scoped(Lifecycle.ResolutionScoped)(target)
    }
  }
}
