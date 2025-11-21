// src/core/client/client-bootstrap.ts

import { di } from "../server/container"; // mismo contenedor
import { getKeyRegistry } from "./decorators/key";
import { getNuiRegistry } from "./decorators/nui";
import { getClientTickRegistry } from "./decorators/tick";
import { NUI } from "./ui-bridge"; // singleton creado en client.ts

export function initClientCore() {
  // 1. Registrar callbacks de NUI
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

  // 2. Registrar KeyMappings
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

  // 3. Registrar OnTick
  setTick(async () => {
    for (const meta of getClientTickRegistry()) {
      const instance = di.resolve(meta.target);
      const method = instance[meta.methodName].bind(instance);
      await method();
    }
  });
}
