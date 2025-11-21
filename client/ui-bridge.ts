export interface NuiEvents {
  "core:setVisible": { visible: boolean };
}

export type NuiEventName = keyof NuiEvents & string;

export interface NuiMessage<T = unknown> {
  action: string;
  data?: T;
}

type NuiHandler<K extends NuiEventName> = (data: NuiEvents[K]) => void | Promise<void>;

export class NuiManager {
  private handlers = new Map<string, NuiHandler<any>[]>();

  send<K extends NuiEventName>(action: K, data: NuiEvents[K]) {
    const message: NuiMessage<NuiEvents[K]> = { action, data };
    SendNuiMessage(JSON.stringify(message));
  }

  setVisible(visible: boolean) {
    SetNuiFocus(visible, visible);
    this.send("core:setVisible", { visible });
  }

  on<K extends NuiEventName>(action: K, handler: NuiHandler<K>) {
    const list = this.handlers.get(action) ?? [];
    list.push(handler as NuiHandler<any>);
    this.handlers.set(action, list);

    RegisterNuiCallbackType(action);

    on(`__cfx_nui:${action}`, async (data: NuiEvents[K], cb: (response: any) => void) => {
      try {
        const handlersForAction = this.handlers.get(action) ?? [];
        for (const h of handlersForAction) {
          await h(data);
        }
        cb({ status: "ok" });
      } catch (err) {
        cb({ status: "error", message: String(err) });
      }
    });
  }
}

export const NUI = new NuiManager();
