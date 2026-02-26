import { METADATA_KEYS } from '../system/metadata-server.keys'

export interface BinaryEventOptions {
  event?: string
  service?: string
}

export interface BinaryEventMetadata {
  methodName: string
  event: string
  service?: string
}

/**
 * Registers a method as a listener for events emitted by a BinaryService process.
 * When the binary writes an event message to stdout, the framework dispatches it
 * to the matching handler automatically.
 *
 * The binary must emit a JSON line with the shape:
 * `{ "type": "event", "event": "<name>", "data": <any> }`
 *
 * @param options.event - Event name to listen for. Defaults to the method name.
 * @param options.service - Target BinaryService name. Only needed when the handler lives outside the service class.
 */
export function BinaryEvent(options: BinaryEventOptions = {}) {
  return (target: any, propertyKey: string, _descriptor: PropertyDescriptor) => {
    const metadata: BinaryEventMetadata = {
      methodName: propertyKey,
      event: options.event ?? propertyKey,
      service: options.service,
    }

    Reflect.defineMetadata(METADATA_KEYS.BINARY_EVENT, metadata, target, propertyKey)
  }
}
