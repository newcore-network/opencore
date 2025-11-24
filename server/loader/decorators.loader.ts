import { di } from "../container";
import { getCommandRegistry } from "../decorators/command";
import { getNetEventRegistry } from "../decorators/netEvent";
import { getTickRegistry } from "../decorators/onTick";


export const loadDecorators = () => {
      // Commands
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