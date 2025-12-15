import { INetTransport, type NetEventContext, type NetTarget } from '../INetTransport'

export class FiveMNetTransport extends INetTransport {
  onNet(
    eventName: string,
    handler: (ctx: NetEventContext, ...args: any[]) => void | Promise<void>,
  ): void {
    onNet(eventName, async (...args: any[]) => {
      const src = Number(source)
      await handler({ clientId: src }, ...args)
    })
  }

  emitNet(eventName: string, target: NetTarget, ...args: any[]): void {
    const realTarget = target === 'all' ? -1 : target
    ;(globalThis as any).emitNet(eventName, realTarget, ...args)
  }
}
