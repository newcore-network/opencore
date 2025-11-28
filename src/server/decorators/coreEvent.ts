import type { CoreEventMap } from "../types/core-events";
import type { ClassConstructor } from "../../system/types";

type CoreEventName = keyof CoreEventMap;

export interface CoreEventMeta {
  event: CoreEventName;
  methodName: string;
  target: ClassConstructor;
}

const coreEventRegistry: CoreEventMeta[] = [];

export function getCoreEventRegistry() {
  return coreEventRegistry;
}

export function OnCoreEvent<E extends CoreEventName>(event: E) {
  return (target: any, propertyKey: string, _descriptor: PropertyDescriptor) => {
    coreEventRegistry.push({
      event,
      methodName: propertyKey,
      target: target.constructor as ClassConstructor,
    });
  };
}
