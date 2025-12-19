import { injectable } from 'tsyringe'
import { ITick } from '../ITick'

/**
 * Node.js implementation of ITick using setInterval.
 * Default tick interval: 0ms (next tick via setImmediate for high frequency)
 */
@injectable()
export class NodeTick implements ITick {
  private tickInterval: number

  constructor(tickInterval: number = 0) {
    this.tickInterval = tickInterval
  }

  setTick(handler: () => void | Promise<void>): void {
    if (this.tickInterval === 0) {
      // High-frequency tick using setImmediate (similar to FiveM's every-frame tick)
      const tick = async () => {
        await handler()
        setImmediate(tick)
      }
      setImmediate(tick)
    } else {
      // Interval-based tick
      setInterval(async () => {
        await handler()
      }, this.tickInterval)
    }
  }
}
