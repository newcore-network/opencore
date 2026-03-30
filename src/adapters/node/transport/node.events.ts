import { EventEmitter } from 'node:events'
import { EventsAPI } from '../../contracts/transport/events.api'
import { loggers } from '../../../kernel/logger'
import { RuntimeContext } from '../../contracts/transport/context'

type NodeTarget = number | number[] | 'all'

export class NodeEvents extends EventsAPI<RuntimeContext> {
  private readonly emitter = new EventEmitter()

  on<TArgs extends readonly unknown[]>(
    event: string,
    handler: (ctx: { clientId?: number; raw?: unknown }, ...args: TArgs) => unknown,
  ): void {
    this.emitter.on(event, (ctx: { clientId?: number; raw?: unknown }, ...args: unknown[]) => {
      void Promise.resolve(handler(ctx, ...(args as unknown as TArgs))).catch((err) => {
        loggers.netEvent.error(`handler error for '${event}'`, {}, err)
      })
    })
  }

  emit(event: string, targetOrArg?: NodeTarget | unknown, ...args: unknown[]): void {
    if (targetOrArg === 'all' || typeof targetOrArg === 'number' || Array.isArray(targetOrArg)) {
      const target = (targetOrArg ?? 'all') as NodeTarget
      const payloadArgs = args

      if (target === 'all') {
        this.emitter.emit(event, { clientId: -1, raw: -1 }, ...payloadArgs)
        return
      }

      if (Array.isArray(target)) {
        for (const clientId of target) {
          this.emitter.emit(event, { clientId, raw: clientId }, ...payloadArgs)
        }
        return
      }

      this.emitter.emit(event, { clientId: target, raw: target }, ...payloadArgs)
      return
    }

    this.emitter.emit(event, { clientId: -1, raw: -1 }, targetOrArg, ...args)
  }

  simulateClientEvent(event: string, clientId: number, ...args: unknown[]): void {
    this.emitter.emit(event, { clientId, raw: clientId }, ...args)
  }

  clearHandlers(): void {
    this.emitter.removeAllListeners()
  }
}
