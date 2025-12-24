import { METADATA_KEYS } from '../system/metadata-client.keys'

/**
 * Registers a method to be executed at a fixed interval (client-side).
 *
 * @remarks
 * This decorator only stores metadata. During bootstrap, the framework schedules the method
 * using the configured interval.
 *
 * Unlike {@link Tick} (every frame), `@Interval()` runs at a slower, fixed cadence.
 *
 * @param ms - Interval in milliseconds between executions.
 *
 * @example
 * ```ts
 * @Client.Controller()
 * export class SyncController {
 *   @Client.Interval(1000)
 *   syncOncePerSecond() {
 *     // ...
 *   }
 * }
 * ```
 */
export function Interval(ms: number) {
  return (target: any, propertyKey: string) => {
    Reflect.defineMetadata(METADATA_KEYS.INTERVAL, { interval: ms }, target, propertyKey)
  }
}
