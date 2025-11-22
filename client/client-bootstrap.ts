
import { di } from "../server/container";
import { getKeyRegistry } from "./decorators/key";
import { getNuiRegistry } from "./decorators/nui";
import { getClientTickRegistry } from "./decorators/tick";

export function initClientCore() {

  for (const meta of getNuiRegistry()) {
    const instance = di.resolve(meta.target);
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

  for (const meta of getKeyRegistry()) {
    const instance = di.resolve(meta.target);
    const method = instance[meta.methodName].bind(instance);

    RegisterKeyMapping(
      `+${meta.methodName}`,
      meta.description,
      "keyboard",
      meta.key
    );

    RegisterCommand(
      `+${meta.methodName}`,
      () => method(),
      false
    );
  }

  setTick(async () => {
    for (const meta of getClientTickRegistry()) {
      const instance = di.resolve(meta.target);
      const method = instance[meta.methodName].bind(instance);
      await method();
    }
  });
}
