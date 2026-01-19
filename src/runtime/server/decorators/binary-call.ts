import { METADATA_KEYS } from '../system/metadata-server.keys'

export interface BinaryCallOptions {
  action?: string
  timeoutMs?: number
  service?: string
}

/**
 * Marks a method as a remote binary action.
 *
 * @remarks
 * The framework replaces the method with an async proxy that communicates
 * with the external binary process.
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
