import { EventsAPI } from '../../contracts/transport/events.api'
import { RuntimeContext } from '../../contracts/transport/context'

export class FiveMEvents extends EventsAPI {
  constructor(private readonly context: RuntimeContext) {
    super()
  }

  on(event: string, handler: any) {
    onNet(event, (...args: any) => {
      const sourceId = this.context === 'server' ? global.source : undefined
      handler({ clientId: sourceId, raw: sourceId }, ...args)
    })
  }

  emit(event: string, targetOrArg?: number | number[] | 'all' | any, ...args: any[]): void {
    if (this.context === 'server') {
      const target = targetOrArg ?? 'all'

      if (target === 'all') {
        emitNet(event, -1, ...args)
      } else if (Array.isArray(target)) {
        for (const id of target) {
          emitNet(event, id, ...args)
        }
      } else {
        emitNet(event, target, ...args)
      }
    } else {
      emitNet(event, ...args)
    }
  }
}
