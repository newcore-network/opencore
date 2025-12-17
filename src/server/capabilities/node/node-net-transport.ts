import { injectable } from 'tsyringe'
import { EventEmitter } from 'events'
import { INetTransport, NetEventContext, NetTarget } from '../INetTransport'

/**
 * Node.js implementation of INetTransport using EventEmitter.
 * Suitable for testing and non-FiveM runtime environments.
 */
@injectable()
export class NodeNetTransport implements INetTransport {
  private eventEmitter = new EventEmitter()
  private handlers = new Map<string, Array<(context: NetEventContext, ...args: any[]) => void>>()

  onNet(eventName: string, handler: (context: NetEventContext, ...args: any[]) => void): void {
    if (!this.handlers.has(eventName)) {
      this.handlers.set(eventName, [])

      // Register internal EventEmitter listener
      this.eventEmitter.on(eventName, (context: NetEventContext, ...args: any[]) => {
        const eventHandlers = this.handlers.get(eventName) || []
        eventHandlers.forEach((h) => h(context, ...args))
      })
    }

    this.handlers.get(eventName)!.push(handler)
  }

  emitNet(eventName: string, target: NetTarget, ...args: any[]): void {
    const context: NetEventContext = {
      clientId: Array.isArray(target) ? target[0] : target,
    }

    this.eventEmitter.emit(eventName, context, ...args)
  }

  /**
   * Utility method for testing: trigger a net event as if it came from a client
   */
  simulateClientEvent(eventName: string, clientId: number, ...args: any[]): void {
    const context: NetEventContext = { clientId }
    this.eventEmitter.emit(eventName, context, ...args)
  }

  /**
   * Utility method for testing: clear all registered handlers
   */
  clearHandlers(): void {
    this.handlers.clear()
    this.eventEmitter.removeAllListeners()
  }
}
