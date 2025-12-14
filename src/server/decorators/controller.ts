import { injectable } from 'tsyringe'
import type { ClassConstructor } from '../../system/class-constructor'
import { METADATA_KEYS } from '../system/metadata-server.keys'

const serverControllerRegistryByResource = new Map<string, Set<ClassConstructor>>()

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
  let registry = serverControllerRegistryByResource.get(key)
  if (!registry) {
    registry = new Set<ClassConstructor>()
    serverControllerRegistryByResource.set(key, registry)
  }
  return Array.from(registry)
}

/**
 * Class decorator used to mark a class as a Server Controller.
 *
 * This decorator performs the following actions:
 * 1. Marks the class as `@injectable` (via tsyringe) for dependency injection.
 * 2. Defines metadata identifying the class as a 'server' type controller.
 * 3. Automatically adds the class constructor to the `serverControllerRegistry`.
 *
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
 */
export function Controller(): (target: ClassConstructor) => void {
  return function (target: ClassConstructor) {
    injectable()(target)
    Reflect.defineMetadata(METADATA_KEYS.CONTROLLER, { type: 'server' }, target)
    const key = getCurrentResourceNameSafe()
    let registry = serverControllerRegistryByResource.get(key)
    if (!registry) {
      registry = new Set<ClassConstructor>()
      serverControllerRegistryByResource.set(key, registry)
    }
    registry.add(target)
  }
}
