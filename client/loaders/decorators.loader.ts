import { di } from '../client-container';
import { clientControllerRegistry } from '../decorators/clientController';
import { getKeyRegistry } from '../decorators/key';
import { getNuiRegistry } from '../decorators/nui';
import { getNetRegistry } from '../decorators/onNet';
import { getClientTickRegistry } from '../decorators/tick';

const instanceCache = new Map<Function, any>();

export const loadDecoradors = () => {
  const nuisRegistered = getNuiRegistry();
  const keysRegistered = getKeyRegistry();
  const netsRegistered = getNetRegistry();
  const ticksRegistered = getClientTickRegistry();

  for (const Controller of clientControllerRegistry) {
    di.resolve(Controller);
  }

  for (const meta of nuisRegistered) {
    const instance = getInstance(meta.target);
    const method = instance[meta.methodName].bind(instance);

    RegisterNuiCallbackType(meta.eventName);

    on(`__cfx_nui:${meta.eventName}`, async (data: any, cb: Function) => {
      try {
        await method(data);
        cb({ ok: true });
      } catch (error) {
        cb({ ok: false, error: String(error) });
      }
    });
  }

  for (const meta of keysRegistered) {
    const instance = getInstance(meta.target);
    const method = instance[meta.methodName].bind(instance);

    RegisterKeyMapping(`+${meta.methodName}`, meta.description, 'keyboard', meta.key);
    RegisterCommand(`+${meta.methodName}`, () => method(), false);
  }

  for (const meta of netsRegistered) {
    const instance = getInstance(meta.target);
    const method = (instance as any)[meta.methodName].bind(instance);

    onNet(meta.eventName, async (...args: any[]) => {
      try {
        await method(...args);
      } catch (error) {
        console.error(
          `[Newcore][OnNet] Error in handler "${meta.eventName}" -> ${meta.methodName}:`,
          error,
        );
      }
    });
  }

  const tickHandlers = ticksRegistered.map((meta) => {
    const instance = getInstance(meta.target);
    const method = instance[meta.methodName].bind(instance);
    return method;
  });

  setTick(async () => {
    for (const handler of tickHandlers) {
      await handler();
    }
  });

  console.log(
    `[DEBUG] Decorators loaded:
    ${nuisRegistered.length} NUI,
    ${keysRegistered.length} Key,
    ${netsRegistered.length} Net,
    ${ticksRegistered.length} Tick.`,
  );
};

const getInstance = (target: Function) => {
  let instance = instanceCache.get(target);
  if (!instance) {
    instance = di.resolve(target as any);
    instanceCache.set(target, instance);
  }
  return instance;
};
