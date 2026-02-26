import { EventsAPI } from '../../contracts/transport/events.api'
import { RuntimeContext } from '../../contracts/transport/context'
import { Player } from '../../../runtime/server/entities/player'

export class FiveMEvents extends EventsAPI<RuntimeContext> {
  constructor(private readonly context: RuntimeContext) {
    super()
  }

  on(event: string, handler: any) {
    onNet(event, (...args: any) => {
      const sourceId = this.context === 'server' ? global.source : undefined
      handler({ clientId: sourceId, raw: sourceId }, ...args)
    })
  }

  emit(event: string, ...args: any[]): void {
    if (this.context !== 'server') {
      emitNet(event, ...args)
      return
    }
    const [target, ...payload] = args
    const send = (id: number) => emitNet(event, id, ...payload)

    if (target === 'all') {
      send(-1)
      return
    }
    if (Array.isArray(target)) {
      target.forEach(send)
      return
    }
    if (target instanceof Player) {
      send(target.clientID)
      return
    }
    send(target)
  }
}
