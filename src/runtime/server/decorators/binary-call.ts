import { METADATA_KEYS } from '../system/metadata-server.keys'

export interface BinaryCallOptions {
  action?: string
  timeoutMs?: number
  service?: string
}

/**
 * marks a method as a remote binary action executed by a BinaryService. When a method decorated with @BinaryCall is invoked, its implementation is never executed locally. Instead, OpenCore replaces the method at runtime with an asynchronous proxy that:
 * - Serializes the method arguments
 * - Sends a request to the associated binary process
 * - Waits for a response
 * - Resolves or rejects the returned Promise
 *
 * From the developer’s perspective, the method behaves like a normal async function, while the actual logic is executed externally.
 */
export function BinaryCall(options: BinaryCallOptions = {}) {
  return (target: any, propertyKey: string, descriptor: PropertyDescriptor) => {
    if (!descriptor.value) {
      throw new Error(`@BinaryCall(): descriptor.value is undefined for method '${propertyKey}'`)
    }

    Reflect.defineMetadata(
      METADATA_KEYS.BINARY_CALL,
      {
        methodName: propertyKey,
        action: options.action ?? propertyKey,
        timeoutMs: options.timeoutMs,
        service: options.service,
      },
      target,
      propertyKey,
    )
  }
}
