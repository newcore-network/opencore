export interface PlayerSessionCreatedPayload {
  clientId: number;
  license: string;
}

export interface PlayerSessionDestroyedPayload {
  clientId: number;
}

export type CoreEventMap = {
  "core:playerSessionCreated": PlayerSessionCreatedPayload;
  "core:playerSessionDestroyed": PlayerSessionDestroyedPayload;
};
