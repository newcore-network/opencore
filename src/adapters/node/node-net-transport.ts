import { EventEmitter } from 'events'
import { injectable } from 'tsyringe'
import { loggers } from '../../kernel/shared'
import type { INetTransport, NetEventContext, NetTarget } from '../contracts/INetTransport'

/**
 * Node.js implementation of INetTransport using EventEmitter.
 * Suitable for testing and non-FiveM runtime environments.
 */
@injectable()
export class NodeNetTransport implements INetTransport {
  private eventEmitter = new EventEmitter()

  onNet(
    eventName: string,
    handler: (context: NetEventContext, ...args: any[]) => void | Promise<void>,
  ): void {
    this.eventEmitter.on(eventName, (ctx: NetEventContext, ...args: any[]) => {
      void Promise.resolve(handler(ctx, ...args)).catch((err) => {
        loggers.netEvent.error(`handler error for '${eventName}'`, {}, err)
      })
    })
  }

  emitNet(eventName: string, target: NetTarget, ...args: any[]): void {
    if (Array.isArray(target)) {
      for (let index = 0; index < target.length; index++) {
        const clientId = target[index]
        const ctx: NetEventContext = { clientId }
        this.eventEmitter.emit(eventName, ctx, ...args)
      }
      return
    }
    const ctx: NetEventContext = { clientId: target === 'all' ? -1 : target }
    this.eventEmitter.emit(eventName, ctx, ...args)
  }

  /**
   * Utility method for testing: trigger a net event as if it came from a client
   */
  simulateClientEvent(eventName: string, clientId: number, ...args: any[]): void {
    const ctx: NetEventContext = { clientId }
    this.eventEmitter.emit(eventName, ctx, ...args)
  }

  /**
   * Utility method for testing: clear all registered handlers
   */
  clearHandlers(): void {
    this.eventEmitter.removeAllListeners()
  }
}
