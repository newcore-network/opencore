import type { ClassConstructor } from '../../system/types'

export interface NetEventMeta {
  eventName: string
  methodName: string
  target: ClassConstructor
}

const netEventRegistry: NetEventMeta[] = []

export function OnNet(eventName: string) {
  return (target: any, propertyKey: string, _descriptor: PropertyDescriptor) => {
    netEventRegistry.push({
      eventName,
      methodName: propertyKey,
      target: target.constructor as ClassConstructor,
    })
  }
}

export function getNetRegistry(): NetEventMeta[] {
  return netEventRegistry
}
