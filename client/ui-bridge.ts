import type { NuiClientToUiEvents, NuiUiToClientEvents } from '@shared/events/nui-events';

type NuiClientToUiEventName = keyof NuiClientToUiEvents & string;
type NuiUiToClientEventName = keyof NuiUiToClientEvents & string;

class NuiManager {
  send<K extends NuiClientToUiEventName>(action: K, data: NuiClientToUiEvents[K]) {
    SendNuiMessage(JSON.stringify({ action, data }));
  }

  on<K extends NuiUiToClientEventName>(
    action: K,
    handler: (data: NuiUiToClientEvents[K]) => void | Promise<void>,
  ) {
    RegisterNuiCallbackType(action);

    on(`__cfx_nui:${action}`, async (data: NuiUiToClientEvents[K], cb: (resp: any) => void) => {
      try {
        await handler(data);
        cb({ ok: true });
      } catch (err) {
        cb({ ok: false, error: String(err) });
      }
    });
  }
}

export const NUI = new NuiManager();
