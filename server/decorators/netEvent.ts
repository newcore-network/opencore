import { ClassConstructor } from "../../shared/types/_system-types_";

export interface NetEventMeta {
  eventName: string;
  methodName: string;
  target: ClassConstructor;
}
const netEventRegistry: NetEventMeta[] = [];

/**
 * Decorator used to mark a controller method as a Net Event handler.
 * The metadata is processed during bootstrap and connected to onNet().
 *
 * @param eventName - The name of the network event
 */
export function OnNetEvent(eventName: string) {
  return (target: any, propertyKey: string, _descriptor: PropertyDescriptor) => {
    netEventRegistry.push({
      eventName,
      methodName: propertyKey,
      target: target.constructor as ClassConstructor,
    });
  };
}
export function getNetEventRegistry(): NetEventMeta[] {
  return netEventRegistry;
}