export type ClassConstructor<T = any> = new (...args: any[]) => T;


export interface CommandMeta {
  name: string;
  methodName: string;
  target: ClassConstructor;
}

export interface NetEventMeta {
  eventName: string;
  methodName: string;
  target: ClassConstructor;
}

export interface TickMeta {
  methodName: string;
  target: ClassConstructor;
}

const commandRegistry: CommandMeta[] = [];
const netEventRegistry: NetEventMeta[] = [];
const tickRegistry: TickMeta[] = [];


/**
 * Decorator used to mark a controller method as a command.
 * The metadata is collected and later bound to FiveM via RegisterCommand().
 *
 * @param name - The command name (e.g. "revive", "deposit")
 */
export function Command(name: string) {
  return (target: any, propertyKey: string, _descriptor: PropertyDescriptor) => {
    commandRegistry.push({
      name,
      methodName: propertyKey,
      target: target.constructor as ClassConstructor,
    });
  };
}


/**
 * Decorator used to mark a controller method as a Net Event handler.
 * The metadata is processed during bootstrap and connected to onNet().
 *
 * @param eventName - The name of the network event
 */
export function NetEvent(eventName: string) {
  return (target: any, propertyKey: string, _descriptor: PropertyDescriptor) => {
    netEventRegistry.push({
      eventName,
      methodName: propertyKey,
      target: target.constructor as ClassConstructor,
    });
  };
}


/**
 * Decorator used to register a method as a Tick handler.
 * Tick handlers run every server frame (setTick()).
 */
export function OnTick() {
  return (target: any, propertyKey: string, _descriptor: PropertyDescriptor) => {
    tickRegistry.push({
      methodName: propertyKey,
      target: target.constructor as ClassConstructor,
    });
  };
}

export function getCommandRegistry(): CommandMeta[] {
  return commandRegistry;
}

export function getNetEventRegistry(): NetEventMeta[] {
  return netEventRegistry;
}

export function getTickRegistry(): TickMeta[] {
  return tickRegistry;
}
