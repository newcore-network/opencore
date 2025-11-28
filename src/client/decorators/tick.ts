export interface ClientTickMeta {
  methodName: string
  target: new (...args: any[]) => any
}

const tickRegistry: ClientTickMeta[] = []

export function ClientTick() {
  return (target: any, propertyKey: string) => {
    tickRegistry.push({
      methodName: propertyKey,
      target: target.constructor,
    })
  }
}

export function getClientTickRegistry() {
  return tickRegistry
}
