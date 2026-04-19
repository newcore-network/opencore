import { createServiceDecorator, type BindingScope } from '../../shared/di/binding'

/**
 * Marks a class as a framework-managed client service.
 *
 * @remarks
 * This decorator matches the server-side `@Service()` contract and registers the
 * class in the DI container as a singleton by default.
 */
export function Service(options?: { scope?: BindingScope }) {
  return createServiceDecorator(options)
}
