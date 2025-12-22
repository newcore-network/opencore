export type NetTarget = number | number[] | 'all'

export type NetEventContext = {
  clientId: number
}

export abstract class INetTransport {
  abstract onNet(
    eventName: string,
    handler: (ctx: NetEventContext, ...args: any[]) => void | Promise<void>,
  ): void

  abstract emitNet(eventName: string, target: NetTarget, ...args: any[]): void
}
