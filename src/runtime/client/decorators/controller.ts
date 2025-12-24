import { injectable } from 'tsyringe'
import type { ClassConstructor } from '../../../kernel/di/class-constructor'
import { METADATA_KEYS } from '../system/metadata-client.keys'

const clientControllerRegistryByResource = new Map<string, Set<ClassConstructor>>()

function getCurrentResourceNameSafe(): string {
  const fn = (globalThis as any).GetCurrentResourceName
  if (typeof fn === 'function') {
    const name = fn()
    if (typeof name === 'string' && name.trim()) return name
  }
  return 'default'
}

export function getClientControllerRegistry(resourceName?: string): ClassConstructor[] {
  const key = resourceName ?? getCurrentResourceNameSafe()
  let registry = clientControllerRegistryByResource.get(key)
  if (!registry) {
    registry = new Set<ClassConstructor>()
    clientControllerRegistryByResource.set(key, registry)
  }
  return Array.from(registry)
}

/**
 * Marks a class as a Client Controller.
 *
 * @remarks
 * This decorator:
 * - Marks the class as `@injectable()` (tsyringe) for dependency injection.
 * - Stores controller metadata identifying it as a `client` controller.
 * - Adds the class to an internal registry so the runtime can discover it during bootstrap.
 *
 * @example
 * ```ts
 * @Client.Controller()
 * export class HudController {
 *   constructor(private readonly notifications: NotificationService) {}
 * }
 * ```
 */
export function Controller() {
  return function (target: ClassConstructor) {
    injectable()(target)
    Reflect.defineMetadata(METADATA_KEYS.CONTROLLER, { type: 'client' }, target)
    const key = getCurrentResourceNameSafe()
    let registry = clientControllerRegistryByResource.get(key)
    if (!registry) {
      registry = new Set<ClassConstructor>()
      clientControllerRegistryByResource.set(key, registry)
    }
    registry.add(target)
  }
}
