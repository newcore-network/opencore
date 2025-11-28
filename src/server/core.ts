import { initServerCore } from "./bootstrap";

export async function init() {
  await initServerCore();
}

export const services = {
  // player: playerService,
  // api: apiClient,
};
