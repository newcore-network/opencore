export interface PlayerSessionCreatedPayload {
  clientId: number;
  license: string;
}

type PlayerSessionCreatedHandler = (payload: PlayerSessionCreatedPayload) => void;

const playerSessionCreatedHandlers: PlayerSessionCreatedHandler[] = [];

export function onPlayerSessionCreated(handler: PlayerSessionCreatedHandler) {
  playerSessionCreatedHandlers.push(handler);
}

export function emitPlayerSessionCreated(payload: PlayerSessionCreatedPayload) {
  for (const handler of playerSessionCreatedHandlers) {
    handler(payload);
  }
}
