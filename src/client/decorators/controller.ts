import { injectable } from 'tsyringe'
import type { ClassConstructor } from '../../system/class-constructor'
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
