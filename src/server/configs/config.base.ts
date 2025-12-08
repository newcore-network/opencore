/**
 * Fluent Configuration Utilities
 *
 * Provides utilities for creating Spring Boot-style fluent configuration APIs.
 * This enables method chaining for cleaner configuration syntax.
 *
 * @example
 * ```ts
 * interface MyConfigState {
 *   host: string
 *   port: number
 *   enabled: boolean
 * }
 *
 * const state: MyConfigState = { host: 'localhost', port: 3000, enabled: true }
 * const configurator = createFluentConfigurator(state)
 *
 * configurator
 *   .host('api.example.com')
 *   .port(8080)
 *   .enabled(false)
 * ```
 */

/**
 * Type that transforms a state object into a fluent configurator interface.
 *
 * Each property becomes a method that:
 * - Accepts a value of the same type as the original property
 * - Returns the configurator for method chaining
 *
 * @template T - The state object type
 */
export type FluentConfigurator<T> = {
  [K in keyof T]: (value: T[K]) => FluentConfigurator<T>
}

/**
 * Creates a fluent configurator from a state object.
 *
 * The configurator allows method chaining to set values on the state object.
 * Each property of the state becomes a method on the configurator.
 *
 * @template T - The state object type
 * @param state - The state object to configure (will be mutated)
 * @returns A fluent configurator with chainable methods
 *
 * @example
 * ```ts
 * interface ApiState {
 *   baseUrl: string
 *   timeout: number
 * }
 *
 * const state: ApiState = { baseUrl: '', timeout: 5000 }
 *
 * createFluentConfigurator(state)
 *   .baseUrl('https://api.example.com')
 *   .timeout(10000)
 *
 * console.log(state.baseUrl) // 'https://api.example.com'
 * console.log(state.timeout) // 10000
 * ```
 */
export function createFluentConfigurator<T extends object>(state: T): FluentConfigurator<T> {
  const configurator = {} as FluentConfigurator<T>

  for (const key of Object.keys(state) as (keyof T)[]) {
    ;(configurator as any)[key] = (value: T[typeof key]) => {
      state[key] = value
      return configurator
    }
  }

  return configurator
}
