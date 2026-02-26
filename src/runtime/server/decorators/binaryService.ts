import path from 'node:path'

import { ClassConstructor } from '../../../kernel/di/class-constructor'
import { METADATA_KEYS } from '../system/metadata-server.keys'
import { Bind } from './bind'

export interface BinaryServiceOptions {
  /** Logical identifier of the service inside OpenCore. This name is used to route binary calls and must be unique per resource. */
  name: string
  /** Logical binary filename (without extension). The framework resolves the correct executable automatically depending on the platform */
  binary: string
  /**
   * Default timeout for binary calls in milliseconds. If the binary does not respond within this time, the call is rejected automatically.
   */
  timeoutMs?: number
}

export interface BinaryServiceMetadata extends BinaryServiceOptions {
  serviceClass: ClassConstructor
}

export const _serverBinaryServiceRegistryByResource = new Map<string, Set<ClassConstructor>>()

function getCurrentResourceNameSafe(): string {
  const fn = (globalThis as any).GetCurrentResourceName
  if (typeof fn === 'function') {
    const name = fn()
    if (typeof name === 'string' && name.trim()) return name
  }
  return 'default'
}

export function getServerBinaryServiceRegistry(resourceName?: string): ClassConstructor[] {
  const key = resourceName ?? getCurrentResourceNameSafe()
  let registry = _serverBinaryServiceRegistryByResource.get(key)
  if (!registry) {
    registry = new Set<ClassConstructor>()
    _serverBinaryServiceRegistryByResource.set(key, registry)
  }
  return Array.from(registry)
}

function assertValidBinaryName(binary: string): void {
  if (!binary || !binary.trim()) {
    throw new Error('[OpenCore] BinaryService requires a non-empty binary name')
  }

  if (binary.includes('.') || path.extname(binary)) {
    throw new Error(`[OpenCore] BinaryService binary name must not include extensions: ${binary}`)
  }

  if (/[/\\]/.test(binary)) {
    throw new Error(
      `[OpenCore] BinaryService binary name must not include path separators: ${binary}`,
    )
  }

  if (!/^[a-zA-Z0-9_-]+$/.test(binary)) {
    throw new Error(`[OpenCore] BinaryService binary name has invalid characters: ${binary}`)
  }
}

function assertValidServiceName(name: string): void {
  if (!name || !name.trim()) {
    throw new Error('[OpenCore] BinaryService requires a non-empty service name')
  }
}

/**
 * Declares a native external binary service managed by OpenCore.
 * A BinaryService represents a persistent operating system process executed outside the FiveM runtime, allowing heavy or sensitive logic to run in complete isolation while being consumed from TypeScript as normal asynchronous methods.
 * Binary services communicate with OpenCore using a simple JSON-based RPC protocol over stdin / stdout.
 *
 * @remarks
 * - The binary name is logical (no extensions). The framework resolves platform-specific files.
 * - A single process is spawned and kept alive for the resource lifecycle.
 * - This system is language-agnostic and can be implemented in any language capable of reading from standard input and writing to standard output.
 */
export function BinaryService(options: BinaryServiceOptions): (target: ClassConstructor) => void {
  return (target: ClassConstructor) => {
    assertValidServiceName(options.name)
    assertValidBinaryName(options.binary)

    Bind('singleton')(target)

    const metadata: BinaryServiceMetadata = {
      ...options,
      serviceClass: target,
    }

    Reflect.defineMetadata(METADATA_KEYS.BINARY_SERVICE, metadata, target)
    Reflect.defineMetadata(METADATA_KEYS.BINARY_SERVICE_NAME, metadata.name, target)

    const key = getCurrentResourceNameSafe()
    let registry = _serverBinaryServiceRegistryByResource.get(key)
    if (!registry) {
      registry = new Set<ClassConstructor>()
      _serverBinaryServiceRegistryByResource.set(key, registry)
    }
    registry.add(target)
  }
}
