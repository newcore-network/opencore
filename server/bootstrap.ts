
import { di } from "./container";
import { getCommandRegistry } from "./decorators/command";
import { getNetEventRegistry } from "./decorators/netEvent";
import { getTickRegistry } from "./decorators/onTick";


/**
 * Initializes the server-side core of the framework.
 *
 * This function reads all collected metadata from decorators
 * (@Command, @NetEvent, @OnTick) and binds them to the actual
 * FiveM runtime functions (RegisterCommand, onNet, setTick).
 *
 * Every decorated method is resolved through the dependency
 * injection container (DI), ensuring controllers and services
 * are instantiated consistently and with proper dependencies.
 */
export function initServerCore() {
  for (const meta of getCommandRegistry()) {
    RegisterCommand(
      meta.name,
      (clientID: number, args: string[]) => {
        const instance = di.resolve(meta.target);
        const method = (instance as any)[meta.methodName].bind(instance);
        method(clientID, args);
      },
      false
    );
  }

  // NetEvents
  for (const meta of getNetEventRegistry()) {
    onNet(meta.eventName, (...args: any[]) => {
      const clientID = Number(global.source);
      const instance = di.resolve(meta.target);
      const method = (instance as any)[meta.methodName].bind(instance);
      method(clientID, ...args);
    });
  }

  // Ticks
  setTick(async () => {
    for (const meta of getTickRegistry()) {
      const instance = di.resolve(meta.target);
      const method = (instance as any)[meta.methodName].bind(instance);
      await method();
    }
  });
}
