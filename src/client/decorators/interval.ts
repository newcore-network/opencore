import { METADATA_KEYS } from '../system/metadata-client.keys'

/**
 * Decorator for creating interval-based ticks.
 * Unlike @Tick which runs every frame, @Interval runs at specified intervals.
 *
 * @param ms - Interval in milliseconds between executions
 */
export function Interval(ms: number) {
  return (target: any, propertyKey: string) => {
    Reflect.defineMetadata(METADATA_KEYS.INTERVAL, { interval: ms }, target, propertyKey)
  }
}
