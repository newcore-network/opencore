import type { DependencyContainer } from 'tsyringe'
import { container } from 'tsyringe'

/**
 * Resets the global DI container to a clean state.
 * Call this in beforeEach to ensure test isolation.
 */
export function resetContainer(): void {
  container.clearInstances()
}

/**
 * Creates a child container for isolated test scenarios.
 * Useful when you need to register test-specific mocks without
 * affecting the global container.
 */
export function createTestContainer(): DependencyContainer {
  return container.createChildContainer()
}

/**
 * Helper to register a mock implementation for a token.
 * @param token - The injection token (class or string)
 * @param mock - The mock implementation
 * @param targetContainer - Optional container (defaults to global)
 */
export function registerMock<T>(
  token: any,
  mock: T,
  targetContainer: DependencyContainer = container,
): void {
  targetContainer.registerInstance(token, mock)
}

/**
 * Helper to resolve a dependency from the container.
 * @param token - The injection token
 * @param targetContainer - Optional container (defaults to global)
 */
export function resolve<T>(token: any, targetContainer: DependencyContainer = container): T {
  return targetContainer.resolve<T>(token)
}

/**
 * Creates a container with common test mocks pre-registered.
 * Extend this function to add more default mocks as needed.
 */
export function createContainerWithMocks(): DependencyContainer {
  const testContainer = createTestContainer()

  // Add common mock registrations here as the project grows
  // Example:
  // testContainer.registerInstance('Logger', createMockLogger())

  return testContainer
}
