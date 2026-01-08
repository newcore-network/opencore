import { EventEmitter } from 'node:events'
import { injectable } from 'tsyringe'
import { IEngineEvents } from '../contracts/IEngineEvents'

/**
 * Node.js implementation of IEngineEvents using EventEmitter.
 * Suitable for testing and non-FiveM runtime environments.
 *
 * Note: In Node.js, there are no native engine events like FiveM's lifecycle events.
 * This implementation provides a mock event system for testing purposes.
 */
@injectable()
export class NodeEngineEvents implements IEngineEvents {
  private eventEmitter = new EventEmitter()

  on(eventName: string, handler?: (...args: any[]) => void): void {
    if (handler) this.eventEmitter.on(eventName, handler)
    else this.eventEmitter.on(eventName, () => {}) // empty handler
  }

  /**
   * Utility method for testing: emit an engine event
   */
  emit(eventName: string, ...args: any[]): void {
    this.eventEmitter.emit(eventName, ...args)
  }

  /**
   * Utility method for testing: clear all event listeners
   */
  clearListeners(): void {
    this.eventEmitter.removeAllListeners()
  }
}
