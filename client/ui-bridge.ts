export const Nui = {
  send<T = unknown>(action: string, data?: T) {
    SendNuiMessage(JSON.stringify({ action, data }));
  },
  
  setVisible(visible: boolean) {
    SetNuiFocus(visible, visible);
    SendNuiMessage(JSON.stringify({ action: 'core:setVisible', data: { visible } }));
  }
};