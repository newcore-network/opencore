import type { ClassConstructor } from '../../system/types'

export interface TickMeta {
  methodName: string
  target: ClassConstructor
}

const tickRegistry: TickMeta[] = []

/**
 * Decorator used to register a method as a Tick handler.
 * Tick handlers run every server frame (setTick()).
 */
export function OnTick() {
  return (target: any, propertyKey: string, _descriptor: PropertyDescriptor) => {
    tickRegistry.push({
      methodName: propertyKey,
      target: target.constructor as ClassConstructor,
    })
  }
}

export function getTickRegistry(): TickMeta[] {
  return tickRegistry
}
