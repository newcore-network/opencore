import { injectable } from 'tsyringe'
import { ClassConstructor } from '../../../kernel/di/class-constructor'
import { Guard, GuardOptions } from './guard'
import { Public } from './public'
import { RequiresState, StateRequirement } from './requiresState'
import { Throttle, ThrottleOptions } from './throttle'
import { METADATA_KEYS } from '../system/metadata-server.keys'

export const _serverControllerRegistryByResource = new Map<string, Set<ClassConstructor>>()

function getCurrentResourceNameSafe(): string {
  const fn = (globalThis as any).GetCurrentResourceName
  if (typeof fn === 'function') {
    const name = fn()
    if (typeof name === 'string' && name.trim()) return name
  }
  return 'default'
}

export function getServerControllerRegistry(resourceName?: string): ClassConstructor[] {
  const key = resourceName ?? getCurrentResourceNameSafe()
  let registry = _serverControllerRegistryByResource.get(key)
  if (!registry) {
    registry = new Set<ClassConstructor>()
    _serverControllerRegistryByResource.set(key, registry)
  }
  return Array.from(registry)
}

export interface ControllerOptions {
  /**
   * Default `@Guard` applied to every method that does not define its own.
   */
  guard?: GuardOptions
  /**
   * Default `@Throttle` applied to every method that does not define its own.
   * Can be a full options object or a tuple `[limit, windowMs]`.
   */
  throttle?: ThrottleOptions | [limit: number, windowMs?: number]
  /**
   * Default `@RequiresState` applied to every method that does not define its own.
   */
  requiresState?: StateRequirement
  /**
   * When `true`, applies `@Public` to every method that is not already marked `@Public()`.
   */
  public?: boolean
}

/**
 * Applies default decorators from `ControllerOptions` to every own method on the
 * prototype that does not already carry the corresponding metadata.
 *
 * This runs when `@Controller(options)` is evaluated, which in TypeScript happens
 * *after* all method decorators have been applied. Therefore the defaults wrap
 * around any existing method wrappers as the outermost layer.
 */
function applyControllerDefaults(target: ClassConstructor, options: ControllerOptions): void {
  const prototype = target.prototype
  const methods = Object.getOwnPropertyNames(prototype).filter(
    (m) => m !== 'constructor' && typeof prototype[m] === 'function',
  )

  for (const methodName of methods) {
    let descriptor = Object.getOwnPropertyDescriptor(prototype, methodName)
    if (!descriptor || typeof descriptor.value !== 'function') continue

    // --- Guard ---
    if (options.guard && !Reflect.hasMetadata('core:guard', prototype, methodName)) {
      const result = Guard(options.guard)(prototype, methodName, descriptor)
      if (result) {
        Object.defineProperty(prototype, methodName, result)
        descriptor = result
      }
    }

    // --- Throttle ---
    if (options.throttle && !Reflect.hasMetadata(METADATA_KEYS.THROTTLE, prototype, methodName)) {
      const d = descriptor
      const throttleArgs: [number | ThrottleOptions, number?] = Array.isArray(options.throttle)
        ? options.throttle
        : [options.throttle]
      const result = Throttle(...throttleArgs)(prototype, methodName, d)
      if (result) {
        Object.defineProperty(prototype, methodName, result)
        descriptor = result
      }
    }

    // --- RequiresState ---
    if (
      options.requiresState &&
      !Reflect.hasMetadata(METADATA_KEYS.REQUIRES_STATE, prototype, methodName)
    ) {
      const d = descriptor
      const result = RequiresState(options.requiresState)(prototype, methodName, d)
      if (result) {
        Object.defineProperty(prototype, methodName, result)
        descriptor = result
      }
    }

    // --- Public ---
    if (
      options.public === true &&
      !Reflect.hasMetadata(METADATA_KEYS.PUBLIC, prototype, methodName)
    ) {
      const d = descriptor
      const result = Public()(prototype, methodName, d)
      if (result) {
        Object.defineProperty(prototype, methodName, result)
        descriptor = result
      }
    }
  }
}

/**
 * Class decorator used to mark a class as a Server Controller.
 *
 * This decorator performs the following actions:
 * 1. Marks the class as `@injectable` (via tsyringe) for dependency injection.
 * 2. Defines metadata identifying the class as a 'server' type controller.
 * 3. Automatically adds the class constructor to the `_serverControllerRegistryByResource`.
 * 4. When `options` are provided, applies default decorators to every method that
 *    does not already define them explicitly.
 *
 * @param options - Optional configuration for default decorations.
 * @returns The decorator function to apply to the class.
 *
 * @example
 * ```ts
 * import { Controller } from '@core/server/decorators'
 *
 * @Server.Controller()
 * export class PlayerController {
 *   constructor(private playerService: PlayerService) {
 *     // Dependency injection works automatically here
 *   }
 * }
 * ```
 *
 * @example
 * ```ts
 * @Server.Controller({
 *   guard: { permission: 'user.authenticated' },
 *   throttle: { limit: 20, windowMs: 1000 },
 * })
 * export class ShopController {
 *   // All methods inherit guard and throttle by default
 * }
 * ```
 */
export function Controller(options?: ControllerOptions): (target: ClassConstructor) => void {
  return (target: ClassConstructor) => {
    injectable()(target)
    Reflect.defineMetadata(METADATA_KEYS.CONTROLLER, { type: 'server', options }, target)
    const key = getCurrentResourceNameSafe()
    let registry = _serverControllerRegistryByResource.get(key)
    if (!registry) {
      registry = new Set<ClassConstructor>()
      _serverControllerRegistryByResource.set(key, registry)
    }
    registry.add(target)

    if (options) {
      applyControllerDefaults(target, options)
    }
  }
}
