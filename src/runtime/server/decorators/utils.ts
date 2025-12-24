import { Bind } from './bind'
import type { BindingScope } from './bind'

/**
 * Marks a class as a framework-managed Service.
 *
 *
 * @remarks
 * This decorator binds the class into the dependency injection container using the provided scope
 * (default: `singleton`).
 *
 * `@Service()` is a convenience wrapper over {@link Bind}. It exists so service-specific behavior
 * can be added in the future without changing user code.
 *
 * @param options.scope - Optional binding scope (`singleton` | `transient`).
 *
 * @example
 * ```ts
 * @Server.Service()
 * export class InventoryService {
 *   addItem() {
 *     // ...
 *   }
 * }
 * ```
 */
export function Service(options?: { scope?: BindingScope }) {
  return Bind(options?.scope ?? 'singleton')
}

/**
 * Marks a class as a Repository within the framework.
 *
 *
 * @remarks
 * A repository abstracts persistence operations (database, API, in-memory, or hybrid storage).
 * It is registered in the dependency injection container using the provided scope
 * (default: `singleton`).
 *
 * `@Repo()` is intentionally separate from {@link Service} to distinguish persistence-oriented
 * classes from business logic.
 *
 * @param options.scope - Optional binding scope (`singleton` | `transient`).
 *
 * @example
 * ```ts
 * @Server.Repo()
 * export class AccountRepository {
 *   async findById(id: string) {
 *     // ...
 *   }
 * }
 * ```
 */
export function Repo(options?: { scope?: BindingScope }) {
  return Bind(options?.scope ?? 'singleton')
}
