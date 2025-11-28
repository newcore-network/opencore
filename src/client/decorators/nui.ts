export type NuiCallbackHandler = (data: any) => void | Promise<void>

export interface NuiCallbackMeta {
  eventName: string
  methodName: string
  target: new (...args: any[]) => any
}

const nuiRegistry: NuiCallbackMeta[] = []

export function NuiCallback(eventName: string) {
  return (target: any, propertyKey: string) => {
    nuiRegistry.push({
      eventName,
      methodName: propertyKey,
      target: target.constructor,
    })
  }
}

export function getNuiRegistry(): NuiCallbackMeta[] {
  return nuiRegistry
}
