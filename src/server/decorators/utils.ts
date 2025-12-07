import { Bind } from './bind'
import type { BindingScope } from './bind'

/**
 * Marks a class as a framework-managed Service.
 *
 * The decorator binds the class into the dependency injection
 * container using the provided scope (default: `singleton`).
 *
 * Services represent reusable, stateless or stateful logic such as:
 * - Business rules
 * - Utility layers
 * - Gameplay systems
 * - Internal modules
 *
 * This decorator is a convenience wrapper over `@Bind()`, allowing
 * future extension of service-specific behavior without changing
 * end-user code.
 *
 * ## Example
 * ```ts
 * @Service()
 * export class InventoryService {
 *   addItem() { ... }
 * }
 * ```
 *
 * @param options.scope - Optional binding scope (`singleton` | `transient`)
 */
export function Service(options?: { scope?: BindingScope }) {
  return Bind(options?.scope ?? 'singleton')
}

/**
 * Marks a class as a Repository within the framework.
 *
 * A Repository abstracts persistence operations (e.g., database,
 * API, in-memory, or hybrid storage). It is registered in the
 * dependency injection container using the provided scope
 * (default: `singleton`).
 *
 * `@Repo()` is intentionally separate from `@Service()` to clearly
 * distinguish persistence-oriented classes from business logic.
 * In the future, repository-specific behavior (caching layers,
 * transactional wrappers, profiling, etc.) can be attached here
 * without modifying user code.
 *
 * ## Example
 * ```ts
 * @Repo()
 * export class AccountRepository {
 *   async findById(id: string) { ... }
 * }
 * ```
 *
 * @param options.scope - Optional binding scope (`singleton` | `transient`)
 */
export function Repo(options?: { scope?: BindingScope }) {
  return Bind(options?.scope ?? 'singleton')
}
